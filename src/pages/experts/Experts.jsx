import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EXPERT_FIELDS, getExpertFieldBadgeClass, DEFAULT_SETTINGS } from '../../lib/constants'
import { StatusBadge, Badge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Plus, Search, Pencil, Trash2, Eye, ClipboardList, CheckCircle, XCircle } from 'lucide-react'

const emptyForm = () => ({
  name: '', org: '', role: '', fields: [],
  sub_field: '', phone: '', email: '', career: '',
  avail: '', cost: '', status: '활동중', memo: '',
})

export default function Experts() {
  const { hasRole } = useAuth()
  const canWrite = hasRole("manager")
  const canDelete = hasRole("admin")
  const canApprove = hasRole("admin")

  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('experts')
  const [experts, setExperts] = useState([])
  const [mentorings, setMentorings] = useState([])
  const [applications, setApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterField, setFilterField] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailExpert, setDetailExpert] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (activeTab === 'applications' && canApprove) loadApplications() }, [activeTab])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: e }, { data: m }] = await Promise.all([
        supabase.from('experts').select('*').order('name'),
        supabase.from('mentorings').select('id, expert_id, status'),
      ])
      setExperts(e || [])
      setMentorings(m || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadApplications() {
    setAppsLoading(true)
    const { data } = await supabase
      .from('expert_applications')
      .select('*')
      .order('created_at', { ascending: false })
    setApplications(data || [])
    setAppsLoading(false)
  }

  async function approveApplication(app) {
    // experts 테이블에 등록
    const { error } = await supabase.from('experts').insert([{
      name: app.applicant_name, phone: app.phone, email: app.email,
      org: app.current_organization, role: app.position,
      field: app.expertise_field,
      career: String(app.career_years ?? ''), avail: app.introduction,
      status: '활동중',
    }])
    if (error) { alert('승인 실패: ' + error.message); return }
    // 신청 상태 업데이트
    await supabase.from('expert_applications')
      .update({ status: 'approved' })
      .eq('id', app.id)
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a))
    loadData()
    alert(`${app.applicant_name} 전문가가 승인되어 등록되었습니다.`)
  }

  async function rejectApplication(app) {
    if (!confirm(`${app.applicant_name} 신청을 거절하시겠습니까?`)) return
    await supabase.from('expert_applications')
      .update({ status: 'rejected' })
      .eq('id', app.id)
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a))
  }

  async function deleteApplication(app) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase.from('expert_applications').delete().eq('id', app.id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setApplications(prev => prev.filter(a => a.id !== app.id))
  }

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(e) {
    setEditingId(e.id)
    setForm({
      name: e.name || '', org: e.org || '', role: e.role || '',
      fields: (e.field || '').split(',').filter(Boolean),
      sub_field: e.sub_field || '',
      phone: e.phone || '', email: e.email || '', career: e.career || '',
      avail: e.avail || '', cost: e.cost || '',
      status: e.status || '활동중', memo: e.memo || '',
    })
    setModalOpen(true)
  }

  function openDetail(e) {
    setDetailExpert(e)
    setDetailOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('이름을 입력해주세요'); return }
    if (form.fields.length === 0) { alert('전문 분야를 하나 이상 선택해주세요'); return }
    const { fields, ...rest } = form
    const payload = { ...rest, field: fields.join(',') }
    try {
      if (editingId) {
        const { error } = await supabase.from('experts').update(payload).eq('id', editingId)
        if (error) throw error
        setExperts(prev => prev.map(e => e.id === editingId ? { ...e, ...payload } : e))
      } else {
        const { data, error } = await supabase.from('experts').insert([payload]).select().single()
        if (error) throw error
        setExperts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setModalOpen(false)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }

  async function handleDelete(id) {
    if (!confirm('이 전문가를 삭제하시겠습니까?')) return
    const { error } = await supabase.from('experts').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setExperts(prev => prev.filter(e => e.id !== id))
  }

  const filtered = experts.filter(e =>
    (!search || e.name?.includes(search) || e.field?.includes(search) || e.sub_field?.includes(search)) &&
    (!filterField || e.field === filterField) &&
    (!filterStatus || e.status === filterStatus)
  )

  const activeCount = experts.filter(e => e.status === '활동중').length
  const fieldCount = new Set(experts.map(e => e.field)).size

  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">전문가 DB</h1>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 gap-1">
        <button
          onClick={() => setActiveTab('experts')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'experts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Eye size={14} /> 전문가 목록
        </button>
        {canApprove && (
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'applications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList size={14} /> 신청 관리
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full leading-none">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── 신청 관리 탭 ── */}
      {activeTab === 'applications' && canApprove && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">전문가 등록 신청 목록</span>
            <span className="text-xs text-gray-400">대기 {applications.filter(a=>a.status==='pending').length}건</span>
          </div>
          {appsLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">로딩 중...</div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">대기 중인 신청이 없습니다</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {applications.map(app => (
                <div key={app.id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800 text-sm">{app.applicant_name}</span>
                        {app.current_organization && <span className="text-xs text-gray-400">{app.current_organization} · {app.position}</span>}
                        <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                          app.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                          app.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-500'
                        }`}>
                          {app.status === 'pending' ? '대기중' : app.status === 'approved' ? '승인됨' : '거절됨'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                        <span>📞 {app.phone}</span>
                        <span>✉️ {app.email}</span>
                        <span>🗂 {app.expertise_field}</span>
                        <span className="text-gray-400">신청일: {app.created_at?.slice(0,10)}</span>
                      </div>
                      {app.career_years && (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 whitespace-pre-line line-clamp-3">
                          경력 {app.career_years}년
                        </p>
                      )}
                      {app.introduction && (
                        <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 rounded-lg p-2 whitespace-pre-line line-clamp-2">
                          💬 {app.introduction}
                        </p>
                      )}
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
                            <XCircle size={12} /> 거절
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

      {/* ── 전문가 목록 탭 ── */}
      {activeTab === 'experts' && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 전문가" value={`${experts.length}명`} color="blue" />
        <StatCard label="활동중" value={`${activeCount}명`} color="green" />
        <StatCard label="누적 상담·멘토링" value={`${mentorings.length}건`} color="teal" />
        <StatCard label="분야 수" value={`${fieldCount}개`} color="orange" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
              placeholder="이름·분야 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterField} onChange={e => setFilterField(e.target.value)}>
            <option value="">전체 분야</option>
            {EXPERT_FIELDS.map(f => <option key={f}>{f}</option>)}
          </select>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">전체 상태</option>
            <option>활동중</option><option>휴식중</option><option>종료</option>
          </select>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
          <Plus size={15} /> 전문가 등록
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['이름', '분야', '세부전문', '소속·직위', '가능일정', '비용', '누적상담', '상태', '관리'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">등록된 전문가가 없습니다</td></tr>
            ) : filtered.map(e => {
              const cnt = mentorings.filter(m => m.expert_id === e.id).length
              return (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <button onClick={() => openDetail(e)} className="flex items-center gap-2">
                      <Avatar name={e.name} />
                      <span className="font-semibold text-blue-600 underline text-xs">{e.name}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(e.field || '').split(',').filter(Boolean).map(f => (
                        <span key={f} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getExpertFieldBadgeClass(f)}`}>{f}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{e.sub_field || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{e.org} <span className="text-gray-400">{e.role}</span></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{e.avail || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{e.cost || '-'}</td>
                  <td className="px-4 py-2.5">
                    <button
                      className="text-xs font-bold text-blue-600 underline"
                      onClick={() => navigate('/mentoring')}
                    >{cnt}건</button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      e.status === '활동중' ? 'bg-green-100 text-green-700' :
                      e.status === '휴식중' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openDetail(e)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Eye size={13} /></button>
                      <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(e.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      </> /* end experts tab */}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '전문가 정보 수정' : '전문가 등록'} wide
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">이름 *</label><input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">소속기관</label><input className="form-input" value={form.org} onChange={e => setField('org', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">직위·직책</label><input className="form-input" value={form.role} onChange={e => setField('role', e.target.value)} /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">전문 분야 * <span className="text-gray-400 font-normal">(복수 선택 가능)</span></label>
            <div className="grid grid-cols-5 gap-1.5">
              {EXPERT_FIELDS.map(f => (
                <label key={f} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium ${
                  form.fields.includes(f) ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}>
                  <input
                    type="checkbox"
                    checked={form.fields.includes(f)}
                    onChange={e => setField('fields', e.target.checked ? [...form.fields, f] : form.fields.filter(x => x !== f))}
                    className="accent-blue-600 w-3 h-3"
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">세부 전문</label><input className="form-input" value={form.sub_field} onChange={e => setField('sub_field', e.target.value)} placeholder="예: AI·빅데이터" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">연락처</label><input className="form-input" value={form.phone} onChange={e => setField('phone', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">이메일</label><input className="form-input" value={form.email} onChange={e => setField('email', e.target.value)} /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">주요 경력</label><textarea className="form-input" value={form.career} onChange={e => setField('career', e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">활동 상태</label>
              <select className="form-input" value={form.status} onChange={e => setField('status', e.target.value)}>
                <option>활동중</option><option>휴식중</option><option>종료</option>
              </select>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">가능 일정</label><input className="form-input" value={form.avail} onChange={e => setField('avail', e.target.value)} placeholder="예: 평일 오전" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">비용</label><input className="form-input" value={form.cost} onChange={e => setField('cost', e.target.value)} placeholder="예: 무료, 10만원/시간" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">메모</label><input className="form-input" value={form.memo} onChange={e => setField('memo', e.target.value)} /></div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {detailExpert && (
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`${detailExpert.name} 전문가 상세`} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[['소속', detailExpert.org], ['직위', detailExpert.role], ['상태', detailExpert.status],
                ['연락처', detailExpert.phone], ['이메일', detailExpert.email], ['비용', detailExpert.cost]].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">{l}</div>
                  <div className="text-sm font-medium text-gray-700">{v || '-'}</div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <div className="text-xs font-semibold text-blue-700 mb-2">전문 분야</div>
              <div className="flex flex-wrap gap-1.5">
                {(detailExpert.field || '').split(',').filter(Boolean).map(f => (
                  <span key={f} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getExpertFieldBadgeClass(f)}`}>{f}</span>
                ))}
                {detailExpert.sub_field && <span className="text-xs text-gray-500 self-center">· {detailExpert.sub_field}</span>}
              </div>
            </div>
            {detailExpert.career && (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">주요 경력</div>
                <div className="text-sm text-gray-700 whitespace-pre-line">{detailExpert.career}</div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2">상담·멘토링 이력 ({mentorings.filter(m => m.expert_id === detailExpert.id).length}건)</div>
              {mentorings.filter(m => m.expert_id === detailExpert.id).slice(0, 5).map(m => (
                <div key={m.id} className="py-2 border-b border-gray-100 flex items-center gap-2 text-xs">
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDetailOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>
            <button onClick={() => { setDetailOpen(false); openEdit(detailExpert) }} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>편집</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
