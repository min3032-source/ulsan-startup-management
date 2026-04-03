import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ULSAN_REGIONS, DEFAULT_SETTINGS, Q_LABELS, calcVerdict, today } from '../../lib/constants'
import { VerdictBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, Pencil, Trash2, ClipboardList, CheckCircle, XCircle, Users } from 'lucide-react'

const emptyForm = () => ({
  name: '', phone: '', biz: '', region: '', gender: '', stage: '',
  q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '',
  verdict: '', date: today(),
})

export default function Intake() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')
  const canDelete = hasRole('admin')
  const canApprove = hasRole('admin')

  const [activeTab, setActiveTab] = useState('founders')
  const [founders, setFounders] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterVerdict, setFilterVerdict] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())

  const [applications, setApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (activeTab === 'applications' && canApprove) loadApplications() }, [activeTab])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: f }, { data: s }] = await Promise.all([
        supabase.from('founders').select('*').order('date', { ascending: false }),
        supabase.from('team_settings').select('*').limit(1).single(),
      ])
      setFounders(f || [])
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadApplications() {
    setAppsLoading(true)
    const { data } = await supabase
      .from('startup_applications')
      .select('*')
      .order('created_at', { ascending: false })
    setApplications(data || [])
    setAppsLoading(false)
  }

  async function approveApplication(app) {
    const { error } = await supabase
      .from('startup_applications')
      .update({ status: 'approved' })
      .eq('id', app.id)
    if (error) { alert('승인 실패: ' + error.message); return }
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a))
  }

  async function rejectApplication(app) {
    if (!confirm(`${app.applicant_name} 신청을 반려하시겠습니까?`)) return
    const { error } = await supabase
      .from('startup_applications')
      .update({ status: 'rejected' })
      .eq('id', app.id)
    if (error) { alert('반려 실패: ' + error.message); return }
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a))
  }

  async function deleteApplication(app) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase
      .from('startup_applications')
      .delete()
      .eq('id', app.id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setApplications(prev => prev.filter(a => a.id !== app.id))
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(f) {
    setEditingId(f.id)
    setForm({
      name: f.name || '', phone: f.phone || '', biz: f.biz || '',
      region: f.region || '', gender: f.gender || '', stage: f.stage || '',
      q1: f.q1 || '', q2: f.q2 || '', q3: f.q3 || '',
      q4: f.q4 || '', q5: f.q5 || '', q6: f.q6 || '', q7: f.q7 || '',
      verdict: f.verdict || '', date: f.date || today(),
    })
    setModalOpen(true)
  }

  function handleFormChange(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field.startsWith('q')) {
        const v = calcVerdict(
          next.q1, next.q2, next.q3, next.q4, next.q5, next.q6, next.q7
        )
        next.verdict = v
      }
      return next
    })
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('이름을 입력해주세요'); return }
    const payload = {
      name: form.name, phone: form.phone, biz: form.biz,
      region: form.region, gender: form.gender, stage: form.stage,
      q1: form.q1, q2: form.q2, q3: form.q3, q4: form.q4,
      q5: form.q5, q6: form.q6, q7: form.q7,
      verdict: form.verdict, date: form.date || today(),
    }
    try {
      if (editingId) {
        const { error } = await supabase.from('founders').update(payload).eq('id', editingId)
        if (error) throw error
        setFounders(prev => prev.map(f => f.id === editingId ? { ...f, ...payload } : f))
      } else {
        const { data, error } = await supabase.from('founders').insert([payload]).select().single()
        if (error) throw error
        setFounders(prev => [data, ...prev])
      }
      setModalOpen(false)
    } catch (e) {
      alert('저장 실패: ' + e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('이 창업자를 삭제하시겠습니까?')) return
    const { error } = await supabase.from('founders').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setFounders(prev => prev.filter(f => f.id !== id))
  }

  const filtered = founders.filter(f =>
    (!search || f.name?.includes(search) || f.phone?.includes(search) || f.biz?.includes(search)) &&
    (!filterVerdict || f.verdict === filterVerdict) &&
    (!filterRegion || f.region === filterRegion)
  )

  const techCount = founders.filter(f => f.verdict?.includes('테크')).length
  const localCount = founders.filter(f => f.verdict?.includes('로컬')).length
  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">상담 접수</h1>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 gap-1">
        <button
          onClick={() => setActiveTab('founders')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'founders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={14} /> 창업자 목록
        </button>
        {canApprove && (
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'applications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList size={14} /> 신청 접수
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full leading-none">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── 신청 접수 탭 ── */}
      {activeTab === 'applications' && canApprove && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">상담 신청 목록</span>
            <span className="text-xs text-gray-400">대기 {pendingCount}건</span>
          </div>
          {appsLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">로딩 중...</div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">신청 내역이 없습니다</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {applications.map(app => (
                <div key={app.id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800 text-sm">{app.applicant_name}</span>
                        <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                          app.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                          app.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-500'
                        }`}>
                          {app.status === 'pending' ? '대기중' : app.status === 'approved' ? '승인됨' : '반려됨'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-1">
                        <span>📞 {app.phone}</span>
                        <span>✉️ {app.email}</span>
                        {app.business_type && <span>🏢 {app.business_type}</span>}
                        {app.business_stage && <span>📈 {app.business_stage}</span>}
                        <span className="text-gray-400">신청일: {app.created_at?.slice(0, 10)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveApplication(app)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          >
                            <CheckCircle size={12} /> 승인
                          </button>
                          <button
                            onClick={() => rejectApplication(app)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-300 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XCircle size={12} /> 반려
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteApplication(app)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={12} /> 삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 창업자 목록 탭 ── */}
      {activeTab === 'founders' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="전체 접수" value={`${founders.length}명`} color="blue" />
            <StatCard label="테크 창업" value={`${techCount}명`} color="teal" />
            <StatCard label="로컬 창업" value={`${localCount}명`} color="green" />
            <StatCard label="혼합형" value={`${founders.length - techCount - localCount}명`} color="orange" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
                  placeholder="이름·업종 검색"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={filterVerdict}
                onChange={e => setFilterVerdict(e.target.value)}
              >
                <option value="">전체 유형</option>
                <option>테크 창업</option>
                <option>로컬 창업</option>
                <option>혼합형 창업</option>
                <option>테크/로컬 창업 (혼합)</option>
              </select>
              <select
                className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={filterRegion}
                onChange={e => setFilterRegion(e.target.value)}
              >
                <option value="">전체 지역</option>
                {ULSAN_REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            {canWrite && (
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg"
                style={{ background: '#2E75B6' }}
              >
                <Plus size={15} /> 창업자 등록
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['이름', '연락처', '사업 아이디어', '지역', '성별', '단계', '판정', '접수일', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">등록된 창업자가 없습니다</td></tr>
                ) : filtered.map(f => (
                  <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={f.name} />
                        <span className="font-medium text-gray-800">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{f.phone}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[140px] truncate">{f.biz}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{f.region}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{f.gender}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{f.stage}</td>
                    <td className="px-4 py-2.5"><VerdictBadge verdict={f.verdict} /></td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{f.date}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {canWrite && (
                          <button onClick={() => openEdit(f)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600">
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(f.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '창업자 정보 수정' : '창업자 등록'}
        wide
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="이름 *">
              <input className="form-input" value={form.name} onChange={e => handleFormChange('name', e.target.value)} />
            </FormField>
            <FormField label="연락처">
              <input className="form-input" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} />
            </FormField>
          </div>
          <FormField label="사업 아이디어">
            <input className="form-input" value={form.biz} onChange={e => handleFormChange('biz', e.target.value)} placeholder="예: AI 기반 물류 최적화" />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="지역">
              <select className="form-input" value={form.region} onChange={e => handleFormChange('region', e.target.value)}>
                <option value="">선택</option>
                {ULSAN_REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField label="성별">
              <select className="form-input" value={form.gender} onChange={e => handleFormChange('gender', e.target.value)}>
                <option value="">선택</option>
                <option>남</option><option>여</option>
              </select>
            </FormField>
            <FormField label="창업 단계">
              <select className="form-input" value={form.stage} onChange={e => handleFormChange('stage', e.target.value)}>
                <option value="">선택</option>
                {settings.stages.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="접수일">
            <input type="date" className="form-input" value={form.date} onChange={e => handleFormChange('date', e.target.value)} />
          </FormField>

          <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
            <div className="text-sm font-semibold text-blue-800">창업 유형 진단 (Q1~Q7)</div>
            {['q1','q2','q3','q4','q5','q6'].map((qk, i) => (
              <div key={qk} className="flex items-start gap-3">
                <div className="text-xs text-gray-600 flex-1 pt-0.5">
                  <span className="font-bold text-blue-600">Q{i + 1}.</span> {Q_LABELS[qk]}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {['yes', 'no'].map(v => (
                    <label key={v} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio" name={qk} value={v}
                        checked={form[qk] === v}
                        onChange={() => handleFormChange(qk, v)}
                        className="w-3.5 h-3.5"
                      />
                      <span className="text-xs">{v === 'yes' ? '예' : '아니오'}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3">
              <div className="text-xs text-gray-600 flex-1 pt-0.5">
                <span className="font-bold text-blue-600">Q7.</span> {Q_LABELS.q7}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {[['tech', '기술 고도화'], ['local', '지역 운영 확대']].map(([v, label]) => (
                  <label key={v} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio" name="q7" value={v}
                      checked={form.q7 === v}
                      onChange={() => handleFormChange('q7', v)}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-xs">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-sm text-gray-600">판정 결과:</span>
            {form.verdict
              ? <VerdictBadge verdict={form.verdict} />
              : <span className="text-xs text-gray-400">Q1~Q7을 모두 선택하면 자동 계산됩니다</span>
            }
          </div>
        </div>
      </Modal>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
