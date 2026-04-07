import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ULSAN_REGIONS, DEFAULT_SETTINGS, Q_LABELS, calcVerdict, today } from '../../lib/constants'
import { VerdictBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, Pencil, Trash2, ClipboardList, CheckCircle, XCircle, Users } from 'lucide-react'

const CONSULT_STATUS_COLORS = {
  '대기중': 'bg-amber-100 text-amber-700',
  '상담중': 'bg-blue-100 text-blue-700',
  '완료':   'bg-green-100 text-green-700',
  '보류':   'bg-gray-100 text-gray-500',
}

const emptyForm = () => ({
  name: '', phone: '', email: '', biz: '',
  region: '', region_detail: '', gender: '', stage: '',
  assignee: '', consult_status: '대기중',
  programs: [], content: '', consult_content: '',
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
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedFounder, setSelectedFounder] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [privacyAgreed, setPrivacyAgreed] = useState(false)

  const [applications, setApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [founderFilter, setFounderFilter] = useState('consultee') // 'all' | 'consultee' | 'founder'
  const [flashId, setFlashId] = useState(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    if (activeTab === 'applications' && canApprove) loadApplications()
  }, [activeTab])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: f }, { data: s }, { data: u }] = await Promise.all([
        supabase.from('founders').select('*').order('date', { ascending: false }),
        supabase.from('team_settings').select('*').limit(1).single(),
        supabase.from('profiles').select('id, name').order('name'),
      ])
      setFounders(f || [])
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s })
      setUsers(u || [])
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
      .is('approved_at', null)
      .order('created_at', { ascending: false })
    const parsed = (data || []).map(app => {
      try {
        const desc = typeof app.description === 'string' ? JSON.parse(app.description) : (app.description || {})
        return {
          ...app,
          region: app.region || desc.region || '',
          region_detail: app.region_detail || desc.region_detail || '',
          gender: app.gender || desc.gender || '',
        }
      } catch {
        return app
      }
    })
    setApplications(parsed)
    setAppsLoading(false)
  }

  async function approveApplication(app) {
    // 1. status 업데이트 먼저
    const { error: statusError } = await supabase
      .from('startup_applications')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', app.id)
    console.log('status 업데이트 결과:', statusError)
    if (statusError) { alert('상태 업데이트 실패: ' + statusError.message); return }

    // 2. status 업데이트 성공 후 founders insert
    const { data: newFounder, error: insertError } = await supabase
      .from('founders')
      .insert([{
        name: app.applicant_name,
        phone: app.phone,
        email: app.email || '',
        region: app.region || '',
        gender: app.gender || '',
        stage: app.business_stage || '',
        consult_status: '대기중',
        date: today(),
        assignee: app.assignee || '',
      }])
      .select()
      .single()
    if (insertError) { alert('상담 목록 추가 실패: ' + insertError.message); return }

    setApplications(prev => prev.filter(a => a.id !== app.id))
    if (newFounder) setFounders(prev => [newFounder, ...prev])
  }

  async function rejectApplication(app) {
    if (!confirm(`${app.applicant_name} 신청을 반려하시겠습니까?`)) return
    const { error } = await supabase
      .from('startup_applications')
      .update({ status: 'rejected' })
      .eq('id', app.id)
    if (error) { alert('반려 실패: ' + error.message); return }
    setApplications(prev => prev.filter(a => a.id !== app.id))
  }

  async function deleteApplication(app) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase.from('startup_applications').delete().eq('id', app.id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setApplications(prev => prev.filter(a => a.id !== app.id))
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setPrivacyAgreed(false)
    setModalOpen(true)
  }

  function openEdit(f, e) {
    e.stopPropagation()
    setEditingId(f.id)
    setForm({
      name: f.name || '', phone: f.phone || '', email: f.email || '',
      biz: f.biz || '', region: f.region || '', region_detail: f.region_detail || '',
      gender: f.gender || '', stage: f.stage || '',
      assignee: f.assignee || '', consult_status: f.consult_status || '대기중',
      programs: f.programs || [], content: f.content || '', consult_content: f.consult_content || '',
      q1: f.q1 || '', q2: f.q2 || '', q3: f.q3 || '',
      q4: f.q4 || '', q5: f.q5 || '', q6: f.q6 || '', q7: f.q7 || '',
      verdict: f.verdict || '', date: f.date || today(),
    })
    setPrivacyAgreed(true)
    setModalOpen(true)
  }

  function openDetail(f) {
    setSelectedFounder(f)
    setDetailOpen(true)
  }

  function handleFormChange(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field.startsWith('q')) {
        next.verdict = calcVerdict(next.q1, next.q2, next.q3, next.q4, next.q5, next.q6, next.q7)
      }
      return next
    })
  }

  function toggleProgram(prog) {
    setForm(prev => {
      const progs = prev.programs || []
      return {
        ...prev,
        programs: progs.includes(prog) ? progs.filter(p => p !== prog) : [...progs, prog],
      }
    })
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('이름을 입력해주세요'); return }
    if (!editingId && !privacyAgreed) { alert('개인정보 수집·이용에 동의해주세요'); return }
    try {
      if (editingId) {
        // 섹션2(담당자 관리 정보)만 저장
        const editPayload = {
          assignee: form.assignee,
          consult_status: form.consult_status,
          consult_content: form.consult_content,
        }
        const { error } = await supabase.from('founders').update(editPayload).eq('id', editingId)
        if (error) throw error
        setFounders(prev => prev.map(f => f.id === editingId ? { ...f, ...editPayload } : f))
      } else {
        const insertPayload = {
          name: form.name, phone: form.phone, email: form.email,
          biz: form.biz, region: form.region,
          region_detail: form.region === '기타(타지역)' ? form.region_detail : '',
          gender: form.gender, stage: form.stage,
          assignee: form.assignee, consult_status: form.consult_status,
          programs: form.programs, content: form.content,
          q1: form.q1, q2: form.q2, q3: form.q3, q4: form.q4,
          q5: form.q5, q6: form.q6, q7: form.q7,
          verdict: form.verdict, date: form.date || today(),
        }
        const { data, error } = await supabase.from('founders').insert([insertPayload]).select().single()
        if (error) throw error
        setFounders(prev => [data, ...prev])
      }
      setModalOpen(false)
    } catch (e) {
      alert('저장 실패: ' + e.message)
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('이 상담 정보를 삭제하시겠습니까?')) return
    const { error } = await supabase.from('founders').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setFounders(prev => prev.filter(f => f.id !== id))
  }

  async function handleAssigneeChange(id, value) {
    const { error } = await supabase.from('founders').update({ assignee: value }).eq('id', id)
    if (error) { alert('담당자 변경 실패: ' + error.message); return }
    setFounders(prev => prev.map(f => f.id === id ? { ...f, assignee: value } : f))
    setFlashId(id)
    setTimeout(() => setFlashId(null), 1200)
  }

  async function handleAppAssigneeChange(appId, value) {
    const { error } = await supabase.from('startup_applications').update({ assignee: value }).eq('id', appId)
    if (error) { alert('담당자 배정 실패: ' + error.message); return }
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, assignee: value } : a))
  }

  async function handleRegisterFounder(id) {
    if (!confirm('이 상담자를 창업자로 등록하시겠습니까?')) return
    const { error } = await supabase.from('founders').update({ is_founder: true }).eq('id', id)
    if (error) { alert('창업자 등록 실패: ' + error.message); return }
    setFounders(prev => prev.map(f => f.id === id ? { ...f, is_founder: true } : f))
  }

  async function handleCancelFounder(id) {
    if (!confirm('창업자 등록을 취소하시겠습니까?')) return
    const { error } = await supabase.from('founders').update({ is_founder: false }).eq('id', id)
    if (error) { alert('등록 취소 실패: ' + error.message); return }
    setFounders(prev => prev.map(f => f.id === id ? { ...f, is_founder: false } : f))
  }

  const filtered = founders.filter(f => {
    const matchSearch = !search || f.name?.includes(search) || f.phone?.includes(search) || f.biz?.includes(search)
    const matchVerdict = !filterVerdict || f.verdict === filterVerdict
    const matchRegion = !filterRegion || f.region === filterRegion
    const matchTab = founderFilter === 'founder' ? f.is_founder === true
      : founderFilter === 'consultee' ? !f.is_founder
      : true
    return matchSearch && matchVerdict && matchRegion && matchTab
  })

  const techCount  = founders.filter(f => f.verdict?.includes('테크') && !f.verdict?.includes('혼합')).length
  const localCount = founders.filter(f => f.verdict?.includes('로컬') && !f.verdict?.includes('혼합')).length
  const mixCount   = founders.filter(f => f.verdict?.includes('혼합') || f.verdict === '테크/로컬 창업 (혼합)').length
  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">상담 접수</h1>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 gap-1">
        <button
          onClick={() => setActiveTab('founders')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'founders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={14} /> 상담 목록
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
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          app.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                          app.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-500'
                        }`}>
                          {app.status === 'pending' ? '대기중' : app.status === 'approved' ? '승인됨' : '반려됨'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>📞 {app.phone}</span>
                        {app.email && <span>✉️ {app.email}</span>}
                        <span>🏢 {app.business_type || '-'}</span>
                        <span>📍 {app.region === '기타(타지역)'
                          ? `타지역${app.region_detail ? ` (${app.region_detail})` : ''}`
                          : (app.region || '-')}
                        </span>
                        {app.business_stage && <span>📈 {app.business_stage}</span>}
                        <span className="text-gray-400">신청일: {app.created_at?.slice(0, 10)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">담당자:</span>
                        <select
                          className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:border-blue-400 bg-white"
                          value={app.assignee || ''}
                          onChange={e => handleAppAssigneeChange(app.id, e.target.value)}
                        >
                          <option value="">미배정</option>
                          {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                        </select>
                        {app.assignee && (
                          <span className="text-xs text-blue-600 font-medium">✓ 배정됨</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveApplication(app)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          >
                            <CheckCircle size={12} /> 승인 → 상담목록
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

      {/* ── 상담 목록 탭 ── */}
      {activeTab === 'founders' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="전체 상담" value={`${founders.length}건`} color="blue" />
            <StatCard label="테크창업"  value={`${techCount}건`}       color="teal" />
            <StatCard label="로컬창업"  value={`${localCount}건`}      color="green" />
            <StatCard label="혼합형"    value={`${mixCount}건`}        color="orange" />
          </div>

          {/* 상담자 / 창업자 필터 탭 */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {[['consultee', '상담자'], ['founder', '창업자'], ['all', '전체']].map(([key, label]) => (
              <button key={key} onClick={() => setFounderFilter(key)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  founderFilter === key ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>{label}</button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
                  placeholder="이름·연락처 검색"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
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
                className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
                value={filterRegion}
                onChange={e => setFilterRegion(e.target.value)}
              >
                <option value="">전체 지역</option>
                {ULSAN_REGIONS.map(r => (
                  <option key={r} value={r}>
                    {r === '기타(타지역)' ? '타지역' : r}
                  </option>
                ))}
              </select>
            </div>
            {canWrite && (
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg"
                style={{ background: '#2E75B6' }}
              >
                <Plus size={15} /> 상담 등록
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['이름', '연락처', '창업유형', '지역', '창업단계', '담당자', '상담상태', '접수일', '관리', '창업자등록'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">등록된 상담이 없습니다</td></tr>
                ) : filtered.map(f => (
                  <tr
                    key={f.id}
                    className={`border-b border-gray-50 cursor-pointer transition-colors ${
                      flashId === f.id ? 'bg-green-50' : 'hover:bg-blue-50'
                    }`}
                    onClick={() => openDetail(f)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={f.name} />
                        <span className="font-medium text-gray-800 text-xs">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{f.phone}</td>
                    <td className="px-4 py-2.5"><VerdictBadge verdict={f.verdict} /></td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {f.region === '기타(타지역)'
                        ? `타지역${f.region_detail ? ` (${f.region_detail})` : ''}`
                        : f.region}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{f.stage}</td>
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <select
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-transparent hover:border-gray-400 focus:outline-none focus:border-blue-400 max-w-[90px]"
                        value={f.assignee || ''}
                        onChange={e => handleAssigneeChange(f.id, e.target.value)}
                      >
                        <option value="">-</option>
                        {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      {f.consult_status
                        ? <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CONSULT_STATUS_COLORS[f.consult_status] || 'bg-gray-100 text-gray-500'}`}>
                            {f.consult_status}
                          </span>
                        : <span className="text-xs text-gray-400">-</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{f.date}</td>
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {canWrite && (
                          <button onClick={e => openEdit(f, e)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600">
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={e => handleDelete(f.id, e)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      {f.is_founder ? (
                        canWrite ? (
                          <button
                            onClick={() => handleCancelFounder(f.id)}
                            className="text-xs px-2 py-0.5 border border-red-300 text-red-600 rounded hover:bg-red-50"
                          >
                            등록 취소
                          </button>
                        ) : <span className="text-xs text-green-600 font-medium">창업자 ✓</span>
                      ) : (f.verdict && canWrite) ? (
                        <button
                          onClick={() => handleRegisterFounder(f.id)}
                          className="text-xs px-2 py-0.5 text-white rounded"
                          style={{ background: '#1E5631' }}
                        >
                          등록
                        </button>
                      ) : <span className="text-xs text-gray-300">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── 상세 보기 모달 ── */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="상담 상세 정보">
        {selectedFounder && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Detail label="이름" value={selectedFounder.name} />
              <Detail label="연락처" value={selectedFounder.phone} />
              <Detail label="이메일" value={selectedFounder.email} />
              <Detail label="성별" value={selectedFounder.gender} />
              <Detail label="지역" value={
                selectedFounder.region === '기타(타지역)'
                  ? `타지역${selectedFounder.region_detail ? ` (${selectedFounder.region_detail})` : ''}`
                  : selectedFounder.region
              } />
              <Detail label="창업 단계" value={selectedFounder.stage} />
              <Detail label="담당자" value={selectedFounder.assignee} />
              <Detail label="상담 상태" value={selectedFounder.consult_status} />
              <Detail label="창업 유형" value={selectedFounder.verdict} />
              <Detail label="접수일" value={selectedFounder.date} />
            </div>
            {selectedFounder.biz && <Detail label="사업 아이디어" value={selectedFounder.biz} />}
            {selectedFounder.content && <Detail label="상담 내용" value={selectedFounder.content} />}
            {selectedFounder.programs?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">희망 지원사업</div>
                <div className="flex flex-wrap gap-1">
                  {selectedFounder.programs.map(p => (
                    <span key={p} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── 등록/수정 모달 ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '상담 정보 수정' : '상담 등록'}
        wide
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button
              onClick={handleSave}
              disabled={!editingId && !privacyAgreed}
              className="px-4 py-1.5 text-sm text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#2E75B6' }}
            >
              저장
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {editingId ? (
            <>
              {/* ── 섹션 1: 신청 정보 (읽기 전용) ── */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">신청 정보 (읽기 전용)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Detail label="이름" value={form.name} />
                  <Detail label="연락처" value={form.phone} />
                  <Detail label="이메일" value={form.email} />
                  <Detail label="성별" value={form.gender} />
                  <Detail label="지역" value={
                    form.region === '기타(타지역)'
                      ? `타지역${form.region_detail ? ` (${form.region_detail})` : ''}`
                      : form.region
                  } />
                  <Detail label="창업 단계" value={form.stage} />
                  <Detail label="신청일" value={form.date} />
                </div>
                {form.verdict && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">창업 유형</div>
                    <VerdictBadge verdict={form.verdict} />
                  </div>
                )}
                {(form.q1 || form.q2 || form.q3) && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-2">창업 유형 진단 답변</div>
                    <div className="space-y-1.5">
                      {['q1','q2','q3','q4','q5','q6'].map((qk, i) => form[qk] && (
                        <div key={qk} className="flex items-start gap-2 text-xs">
                          <span className="font-semibold text-blue-600 shrink-0 w-6">Q{i+1}.</span>
                          <span className="text-gray-600 flex-1 leading-relaxed">{Q_LABELS[qk]}</span>
                          <span className={`shrink-0 font-medium ${form[qk] === 'yes' ? 'text-blue-600' : 'text-gray-400'}`}>
                            {form[qk] === 'yes' ? '예' : '아니오'}
                          </span>
                        </div>
                      ))}
                      {form.q7 && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="font-semibold text-blue-600 shrink-0 w-6">Q7.</span>
                          <span className="text-gray-600 flex-1 leading-relaxed">{Q_LABELS.q7}</span>
                          <span className="shrink-0 font-medium text-gray-500">
                            {form.q7 === 'tech' ? '기술 고도화' : '지역 운영 확대'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {form.programs?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">희망 지원사업</div>
                    <div className="flex flex-wrap gap-1">
                      {form.programs.map(p => (
                        <span key={p} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {form.content && <Detail label="신청 내용" value={form.content} />}
              </div>

              {/* ── 섹션 2: 담당자 관리 정보 (수정 가능) ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">담당자 관리</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="담당자">
                    <select className="form-input" value={form.assignee} onChange={e => handleFormChange('assignee', e.target.value)}>
                      <option value="">선택</option>
                      {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="상담 상태">
                    <select className="form-input" value={form.consult_status} onChange={e => handleFormChange('consult_status', e.target.value)}>
                      {['대기중', '상담중', '완료', '보류'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField label="상담 메모">
                  <textarea
                    className="form-input"
                    rows={4}
                    value={form.consult_content}
                    onChange={e => handleFormChange('consult_content', e.target.value)}
                    placeholder="상담 내용, 진행 사항 등을 입력하세요"
                  />
                </FormField>
              </div>
            </>
          ) : (
            <>
              {/* ── 신규 등록 폼 ── */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="이름 *">
                  <input className="form-input" value={form.name} onChange={e => handleFormChange('name', e.target.value)} />
                </FormField>
                <FormField label="연락처">
                  <input className="form-input" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} />
                </FormField>
              </div>
              <FormField label="이메일">
                <input type="email" className="form-input" value={form.email} onChange={e => handleFormChange('email', e.target.value)} placeholder="example@email.com" />
              </FormField>
              <FormField label="사업 아이디어">
                <input className="form-input" value={form.biz} onChange={e => handleFormChange('biz', e.target.value)} placeholder="예: AI 기반 물류 최적화" />
              </FormField>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="지역">
                  <select className="form-input" value={form.region} onChange={e => handleFormChange('region', e.target.value)}>
                    <option value="">선택</option>
                    {ULSAN_REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                  {form.region === '기타(타지역)' && (
                    <input
                      className="form-input mt-1.5"
                      placeholder="어느 지역인지 입력해주세요"
                      value={form.region_detail}
                      onChange={e => handleFormChange('region_detail', e.target.value)}
                    />
                  )}
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
              <div className="grid grid-cols-2 gap-3">
                <FormField label="담당자">
                  <select className="form-input" value={form.assignee} onChange={e => handleFormChange('assignee', e.target.value)}>
                    <option value="">선택</option>
                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </FormField>
                <FormField label="상담 상태">
                  <select className="form-input" value={form.consult_status} onChange={e => handleFormChange('consult_status', e.target.value)}>
                    {['대기중', '상담중', '완료', '보류'].map(s => <option key={s}>{s}</option>)}
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
                          <input type="radio" name={qk} value={v} checked={form[qk] === v} onChange={() => handleFormChange(qk, v)} className="w-3.5 h-3.5" />
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
                        <input type="radio" name="q7" value={v} checked={form.q7 === v} onChange={() => handleFormChange('q7', v)} className="w-3.5 h-3.5" />
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
              <FormField label="희망 지원사업">
                <div className="flex flex-wrap gap-2 mt-1">
                  {settings.programs.map(p => (
                    <label key={p} className="flex items-center gap-1 cursor-pointer text-xs">
                      <input type="checkbox" checked={(form.programs || []).includes(p)} onChange={() => toggleProgram(p)} className="w-3.5 h-3.5" />
                      {p}
                    </label>
                  ))}
                </div>
              </FormField>
              <FormField label="신청 내용">
                <textarea className="form-input" rows={3} value={form.content} onChange={e => handleFormChange('content', e.target.value)} placeholder="신청 내용을 입력하세요" />
              </FormField>
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="intake-privacy" checked={privacyAgreed} onChange={e => setPrivacyAgreed(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <label htmlFor="intake-privacy" className="text-xs text-gray-700 cursor-pointer">
                    개인정보 수집·이용에 동의합니다. <span className="text-red-500">(필수)</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  수집 항목: 성명, 연락처, 이메일, 사업 관련 정보 · 수집 목적: 창업 상담 서비스 제공 · 보유 기간: 상담 종료 후 3년
                </p>
              </div>
            </>
          )}
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

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-800">{value || '-'}</div>
    </div>
  )
}
