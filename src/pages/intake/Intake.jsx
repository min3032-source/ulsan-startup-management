import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ULSAN_REGIONS, DEFAULT_SETTINGS, Q_LABELS, calcVerdict, today } from '../../lib/constants'
import StartupTypeQuiz from '../../components/StartupTypeQuiz'
import { VerdictBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, Pencil, Trash2, ClipboardList, CheckCircle, XCircle, Users } from 'lucide-react'
import ConsultProgress from '../../components/common/ConsultProgress'

const CONSULT_STATUS_COLORS = {
  '대기중': 'bg-amber-100 text-amber-700',
  '상담중': 'bg-blue-100 text-blue-700',
  '완료':   'bg-green-100 text-green-700',
  '보류':   'bg-gray-100 text-gray-500',
}

const emptyForm = () => ({
  name: '', phone: '', email: '', biz: '', company_name: '',
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
  const canAssign = hasRole('admin')   // 마스터 + 관리자(Admin)

  const [activeTab, setActiveTab] = useState('founders')
  const [founders, setFounders] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterVerdict, setFilterVerdict] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [toast, setToast] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedFounder, setSelectedFounder] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [privacyAgreed, setPrivacyAgreed] = useState(false)

  // 3단계 신규 등록 모달
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerStep, setRegisterStep] = useState(1)
  const [regForm, setRegForm] = useState({
    name: '', phone: '', email: '', gender: '', region: '', region_detail: '',
    verdict: '',
    company_name: '', biz: '', stage: '', assignee: '', consult_status: '대기중', content: '',
  })

  const [applications, setApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [founderFilter, setFounderFilter] = useState('consultee') // 'all' | 'consultee' | 'founder'
  const [flashId, setFlashId] = useState(null)
  const [consultCounts, setConsultCounts] = useState({})

  // 상담일지 모달
  const [consultJournalOpen, setConsultJournalOpen] = useState(false)
  const [journalFounder, setJournalFounder] = useState(null)
  const [journals, setJournals] = useState([])
  const [journalsLoading, setJournalsLoading] = useState(false)
  const [journalForm, setJournalForm] = useState({ date: today(), method: '', content: '', result: '', status: '상담중', next_date: '', staff: '' })
  const [journalSaving, setJournalSaving] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    if (activeTab === 'applications' && canApprove) loadApplications()
  }, [activeTab])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: f }, { data: s }, { data: u }, { data: cc }] = await Promise.all([
        supabase.from('founders').select('*').order('date', { ascending: false }),
        supabase.from('team_settings').select('*').limit(1).single(),
        supabase.from('profiles').select('id, name').order('name'),
        supabase.from('consults').select('founder_id'),
      ])
      setFounders(f || [])
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s })
      setUsers(u || [])
      const counts = {}
      for (const c of cc || []) {
        counts[c.founder_id] = (counts[c.founder_id] || 0) + 1
      }
      setConsultCounts(counts)
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
        region_detail: app.region_detail || '',
        gender: app.gender || '',
        stage: app.business_stage || '',
        verdict: app.business_type || '',
        company_name: app.business_name || '',
        biz: app.business_name || '',
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
    setRegForm({
      name: '', phone: '', email: '', gender: '', region: '', region_detail: '',
      verdict: '',
      company_name: '', biz: '', stage: '', assignee: '', consult_status: '대기중', content: '',
    })
    setRegisterStep(1)
    setRegisterOpen(true)
  }

  function setRegField(k, v) {
    setRegForm(p => ({ ...p, [k]: v }))
  }

  async function handleRegisterSave() {
    if (!regForm.name.trim()) { alert('이름을 입력해주세요'); return }
    const payload = {
      name: regForm.name, phone: regForm.phone, email: regForm.email,
      gender: regForm.gender, region: regForm.region,
      region_detail: regForm.region === '기타(타지역)' ? regForm.region_detail : '',
      verdict: regForm.verdict,
      company_name: regForm.company_name || '',
      biz: regForm.biz, stage: regForm.stage,
      assignee: regForm.assignee, consult_status: regForm.consult_status,
      content: regForm.content,
      date: today(),
    }
    const { data, error } = await supabase.from('founders').insert([payload]).select().single()
    if (error) { alert('저장 실패: ' + error.message); return }
    setFounders(prev => [data, ...prev])
    setConsultCounts(prev => ({ ...prev, [data.id]: 0 }))
    setRegisterOpen(false)
    showToast('상담자가 등록되었습니다.')
  }

  function openEdit(f, e) {
    e.stopPropagation()
    setEditingId(f.id)
    setForm({
      name: f.name || '', phone: f.phone || '', email: f.email || '',
      biz: f.biz || '', company_name: f.company_name || '',
      region: f.region || '', region_detail: f.region_detail || '',
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
        const prevFounder = founders.find(f => f.id === editingId)
        // 섹션2(담당자 관리 정보)만 저장
        const editPayload = {
          assignee: form.assignee,
          consult_status: form.consult_status,
          consult_content: form.consult_content,
        }
        const { error } = await supabase.from('founders').update(editPayload).eq('id', editingId)
        if (error) throw error
        setFounders(prev => prev.map(f => f.id === editingId ? { ...f, ...editPayload } : f))

        // 상담 완료 시 신청자에게 이메일
        if (
          form.consult_status === '완료' &&
          prevFounder?.consult_status !== '완료' &&
          prevFounder?.email
        ) {
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                to: prevFounder.email,
                subject: '[창업지원] 상담이 완료되었습니다',
                html: `
                  <h2>상담이 완료되었습니다</h2>
                  <p>${prevFounder.name}님, 창업 상담이 완료되었습니다.</p>
                  <p>담당자: ${form.assignee || prevFounder.assignee || '-'}</p>
                  <p>추가 문의사항이 있으시면 아래 링크를 통해 재신청해주세요.</p>
                  <a href="https://ulsan-startup-management.vercel.app/apply">상담 재신청하기</a>
                `,
              },
            })
          } catch (e) {
            console.error('완료 이메일 발송 실패:', e)
          }
        }
      } else {
        const insertPayload = {
          name: form.name, phone: form.phone, email: form.email,
          biz: form.biz, company_name: form.company_name || '',
          region: form.region,
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

    // 담당자에게 이메일 발송
    if (value) {
      try {
        const founder = founders.find(f => f.id === id)
        const { data: profile } = await supabase
          .from('profiles').select('email').eq('name', value).single()
        if (profile?.email && founder) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: profile.email,
              subject: '[창업지원] 새 상담자가 배정되었습니다',
              html: `
                <h2>새 상담자 배정 안내</h2>
                <p>담당자님, 새로운 상담자가 배정되었습니다.</p>
                <p><strong>상담자:</strong> ${founder.name}</p>
                <p><strong>연락처:</strong> ${founder.phone}</p>
                <p><strong>창업유형:</strong> ${founder.verdict || '-'}</p>
                <p><strong>신청 내용:</strong> ${founder.content || '-'}</p>
                <br>
                <a href="https://ulsan-startup-management.vercel.app"
                  style="background:#2D6A9F;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">
                  시스템 바로가기
                </a>
              `,
            },
          })
        }
      } catch (e) {
        console.error('담당자 이메일 발송 실패:', e)
      }
    }
  }

  async function handleAppAssigneeChange(appId, value) {
    const { error } = await supabase.from('startup_applications').update({ assignee: value }).eq('id', appId)
    if (error) { alert('담당자 배정 실패: ' + error.message); return }
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, assignee: value } : a))
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleRegisterFounder(id) {
    if (!confirm('이 상담자를 창업자로 등록하시겠습니까?')) return
    const { error } = await supabase.from('founders').update({ is_founder: true }).eq('id', id)
    if (error) { alert('창업자 등록 실패: ' + error.message); return }
    setFounders(prev => prev.map(f => f.id === id ? { ...f, is_founder: true } : f))
    showToast('창업자로 등록되었습니다.')
  }

  async function handleCancelFounder(id) {
    if (!confirm('창업자 등록을 취소하시겠습니까?')) return
    const { error } = await supabase.from('founders').update({ is_founder: false }).eq('id', id)
    if (error) { alert('등록 취소 실패: ' + error.message); return }
    setFounders(prev => prev.map(f => f.id === id ? { ...f, is_founder: false } : f))
  }

  async function openConsultJournal(f, e) {
    e.stopPropagation()
    setJournalFounder(f)
    setJournalForm({ date: today(), method: '', content: '', result: '', status: '상담중', next_date: '', staff: f.assignee || '' })
    setConsultJournalOpen(true)
    setJournalsLoading(true)
    const { data } = await supabase.from('consults').select('*').eq('founder_id', f.id).order('date', { ascending: false })
    setJournals(data || [])
    setJournalsLoading(false)
  }

  async function saveJournal() {
    if (!journalForm.content.trim()) { alert('상담 내용을 입력해주세요'); return }
    setJournalSaving(true)
    const { data, error } = await supabase.from('consults').insert([{
      founder_id: journalFounder.id,
      date: journalForm.date,
      staff: journalForm.staff,
      method: journalForm.method,
      content: journalForm.content,
      result: journalForm.result,
      status: journalForm.status,
      next_date: journalForm.next_date || null,
    }]).select().single()
    setJournalSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setJournals(prev => [data, ...prev])
    setJournalForm({ date: today(), method: '', content: '', result: '', status: '상담중', next_date: '', staff: '' })
    setConsultCounts(prev => ({ ...prev, [journalFounder.id]: (prev[journalFounder.id] || 0) + 1 }))
    showToast('상담일지가 저장되었습니다.')
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

  const techCount  = founders.filter(f => f.verdict === '테크 창업').length
  const localCount = founders.filter(f => f.verdict === '로컬 창업').length
  const mixCount   = founders.filter(f => f.verdict === '상담 후 결정' || !f.verdict).length
  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-pulse">
          {toast}
        </div>
      )}
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
                          className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:border-blue-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                          value={app.assignee || ''}
                          onChange={e => handleAppAssigneeChange(app.id, e.target.value)}
                          disabled={!canAssign}
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
            <StatCard label="판정 대기"  value={`${mixCount}건`}        color="orange" />
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
                <option>상담 후 결정</option>
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
                  {['이름', '기업명', '연락처', '창업유형', '지역', '창업단계', '담당자', '진행상태', '상담상태', '접수일', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400 text-sm">등록된 상담이 없습니다</td></tr>
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
                    <td className="px-4 py-2.5 text-xs text-gray-600">{f.company_name || '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{f.phone}</td>
                    <td className="px-4 py-2.5">
                      {f.verdict ? <VerdictBadge verdict={f.verdict} /> : <span className="text-xs text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {f.region === '기타(타지역)'
                        ? `타지역${f.region_detail ? ` (${f.region_detail})` : ''}`
                        : (f.region || '-')}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{f.stage}</td>
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <select
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-transparent hover:border-gray-400 focus:outline-none focus:border-blue-400 max-w-[90px] disabled:opacity-50 disabled:cursor-not-allowed"
                        value={f.assignee || ''}
                        onChange={e => handleAssigneeChange(f.id, e.target.value)}
                        disabled={!canAssign}
                      >
                        <option value="">-</option>
                        {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <ConsultProgress
                        assignee={f.assignee}
                        consultCount={consultCounts[f.id] || 0}
                        consultStatus={f.consult_status}
                        small
                      />
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
            {/* 진행상태 */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1.5">진행상태</div>
              <ConsultProgress
                assignee={selectedFounder.assignee}
                consultCount={consultCounts[selectedFounder.id] || 0}
                consultStatus={selectedFounder.consult_status}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Detail label="이름" value={selectedFounder.name} />
              <Detail label="연락처" value={selectedFounder.phone} />
              <Detail label="이메일" value={selectedFounder.email} />
              <Detail label="성별" value={selectedFounder.gender} />
              <Detail label="기업명" value={selectedFounder.company_name} />
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

      {/* ── 3단계 신규 등록 모달 ── */}
      <Modal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title={`현장 상담자 등록 (${registerStep}/3단계)`}
        wide
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1.5">
              {[1,2,3].map(s => (
                <div key={s} className={`w-2.5 h-2.5 rounded-full transition-colors ${registerStep === s ? 'bg-blue-600' : registerStep > s ? 'bg-blue-300' : 'bg-gray-200'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              {registerStep > 1 && (
                <button onClick={() => setRegisterStep(p => p - 1)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">이전</button>
              )}
              <button onClick={() => setRegisterOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              {registerStep === 1 ? (
                <button
                  onClick={() => {
                    if (!regForm.name.trim()) { alert('이름을 입력해주세요'); return }
                    if (!regForm.phone.trim()) { alert('연락처를 입력해주세요'); return }
                    setRegisterStep(2)
                  }}
                  className="px-4 py-1.5 text-sm text-white rounded-lg"
                  style={{ background: '#2E75B6' }}
                >다음</button>
              ) : registerStep === 3 ? (
                <button
                  onClick={handleRegisterSave}
                  className="px-4 py-1.5 text-sm text-white rounded-lg"
                  style={{ background: '#2E75B6' }}
                >등록 완료</button>
              ) : null}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* 1단계: 기본 정보 */}
          {registerStep === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">기본 정보</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="이름 *">
                  <input className="form-input" value={regForm.name} onChange={e => setRegField('name', e.target.value)} placeholder="홍길동" />
                </FormField>
                <FormField label="연락처 *">
                  <input className="form-input" value={regForm.phone} onChange={e => setRegField('phone', e.target.value)} placeholder="010-0000-0000" />
                </FormField>
              </div>
              <FormField label="이메일">
                <input type="email" className="form-input" value={regForm.email} onChange={e => setRegField('email', e.target.value)} placeholder="example@email.com" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="성별">
                  <select className="form-input" value={regForm.gender} onChange={e => setRegField('gender', e.target.value)}>
                    <option value="">선택</option>
                    <option>남</option><option>여</option>
                  </select>
                </FormField>
                <FormField label="지역">
                  <select className="form-input" value={regForm.region} onChange={e => setRegField('region', e.target.value)}>
                    <option value="">선택</option>
                    {ULSAN_REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                  {regForm.region === '기타(타지역)' && (
                    <input className="form-input mt-1.5" placeholder="지역 입력" value={regForm.region_detail} onChange={e => setRegField('region_detail', e.target.value)} />
                  )}
                </FormField>
              </div>
            </div>
          )}

          {/* 2단계: 창업유형 자가진단 */}
          {registerStep === 2 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">창업 유형 자가진단</p>
              <StartupTypeQuiz
                onComplete={(result) => {
                  setRegField('verdict', result.verdict)
                  setRegisterStep(3)
                }}
              />
            </div>
          )}

          {/* 3단계: 상담 정보 */}
          {registerStep === 3 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">상담 정보</p>
              <FormField label="기업명">
                <input className="form-input" value={regForm.company_name} onChange={e => setRegField('company_name', e.target.value)} placeholder="예: (주)울산테크" />
              </FormField>
              <FormField label="창업 아이템">
                <textarea className="form-input" rows={2} value={regForm.biz} onChange={e => setRegField('biz', e.target.value)} placeholder="예: AI 기반 물류 최적화 플랫폼" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="창업 단계">
                  <select className="form-input" value={regForm.stage} onChange={e => setRegField('stage', e.target.value)}>
                    <option value="">선택</option>
                    {settings.stages.map(s => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="담당자">
                  <select className="form-input" value={regForm.assignee} onChange={e => setRegField('assignee', e.target.value)}>
                    <option value="">선택</option>
                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="상담 상태">
                  <select className="form-input" value={regForm.consult_status} onChange={e => setRegField('consult_status', e.target.value)}>
                    {['대기중','상담중','완료','보류'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="메모">
                <textarea className="form-input" rows={3} value={regForm.content} onChange={e => setRegField('content', e.target.value)} placeholder="상담 내용, 요청사항 등" />
              </FormField>
            </div>
          )}
        </div>
      </Modal>

      {/* ── 등록/수정 모달 (수정 전용) ── */}
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
                  <Detail label="기업명" value={form.company_name} />
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

      {/* ── 상담일지 모달 ── */}
      <Modal
        isOpen={consultJournalOpen}
        onClose={() => setConsultJournalOpen(false)}
        title={`상담일지 — ${journalFounder?.name || ''}`}
        wide
      >
        {journalFounder && (
          <div className="space-y-4">
            {/* 상담자 정보 (읽기 전용) */}
            <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 border border-gray-200">
              <span><strong>상담자:</strong> {journalFounder.name}</span>
              {journalFounder.biz && <span><strong>기업명:</strong> {journalFounder.biz}</span>}
              {journalFounder.verdict && <span><strong>창업유형:</strong> {journalFounder.verdict}</span>}
            </div>

            {/* 이전 상담일지 목록 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">이전 상담일지</p>
              {journalsLoading ? (
                <div className="text-center py-4 text-gray-400 text-xs">로딩 중...</div>
              ) : journals.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-xs">아직 상담 내역이 없습니다.</div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {journals.map(j => (
                    <div key={j.id} className="border border-gray-100 rounded-lg p-3 bg-white text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">{j.date?.slice(0, 10)}</span>
                        <div className="flex gap-2 text-gray-400">
                          {j.method && <span className="px-1.5 py-0.5 bg-gray-100 rounded">{j.method}</span>}
                          {j.staff && <span>{j.staff}</span>}
                          {j.status && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{j.status}</span>}
                        </div>
                      </div>
                      {j.content && <p className="text-gray-600 leading-relaxed">{j.content}</p>}
                      {j.result && <p className="text-blue-600">→ {j.result}</p>}
                      {j.next_date && <p className="text-orange-500">다음 상담: {j.next_date}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 새 상담일지 작성 */}
            <div className="border border-blue-100 rounded-xl p-4 space-y-3 bg-blue-50/30">
              <p className="text-xs font-semibold text-blue-700">새 상담일지 등록</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="상담일시">
                  <input type="date" className="form-input" value={journalForm.date} onChange={e => setJournalForm(p => ({ ...p, date: e.target.value }))} />
                </FormField>
                <FormField label="상담방법">
                  <select className="form-input" value={journalForm.method} onChange={e => setJournalForm(p => ({ ...p, method: e.target.value }))}>
                    <option value="">선택</option>
                    {['방문상담', '화상상담', '전화상담', '이메일', '기타'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="담당자">
                  <select className="form-input" value={journalForm.staff} onChange={e => setJournalForm(p => ({ ...p, staff: e.target.value }))}>
                    <option value="">선택</option>
                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </FormField>
                <FormField label="상태">
                  <select className="form-input" value={journalForm.status} onChange={e => setJournalForm(p => ({ ...p, status: e.target.value }))}>
                    {['상담중', '완료', '후속필요', '보류'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="상담내용">
                <textarea className="form-input" rows={3} value={journalForm.content} onChange={e => setJournalForm(p => ({ ...p, content: e.target.value }))} placeholder="상담 내용을 입력하세요" />
              </FormField>
              <FormField label="상담결과">
                <textarea className="form-input" rows={2} value={journalForm.result} onChange={e => setJournalForm(p => ({ ...p, result: e.target.value }))} placeholder="상담 결과 및 특이사항" />
              </FormField>
              <FormField label="다음 상담 예정일 (선택)">
                <input type="date" className="form-input" value={journalForm.next_date} onChange={e => setJournalForm(p => ({ ...p, next_date: e.target.value }))} />
              </FormField>
              <button
                onClick={saveJournal}
                disabled={journalSaving}
                className="w-full py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ background: '#2E75B6' }}
              >
                {journalSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        )}
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
