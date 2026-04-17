import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, Search, ChevronDown } from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import PageHeader from '../../components/common/PageHeader'

const PROGRAM_STATUSES = ['매칭대기', '진행중', '완료', '중단']
const SESSION_STATUSES = ['예정', '완료', '취소']

const STATUS_COLOR = {
  '매칭대기': 'bg-amber-100 text-amber-700',
  '진행중':   'bg-blue-100 text-blue-700',
  '완료':     'bg-green-100 text-green-700',
  '중단':     'bg-red-100 text-red-500',
  '예정':     'bg-gray-100 text-gray-600',
  '취소':     'bg-red-100 text-red-500',
}

const emptyProgram = () => ({
  title: '', mentor_id: '', mentee_name: '', mentee_phone: '', mentee_email: '',
  total_sessions: 5, goal: '', start_date: '', end_date: '', assignee: '', status: '매칭대기',
})

const emptySession = (programId, nextNum) => ({
  program_id: programId, session_number: nextNum, session_date: '',
  content: '', homework: '', next_goal: '', status: '예정',
})

export default function Mentoring() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')

  const [tab, setTab]               = useState('programs')
  const [programs, setPrograms]     = useState([])
  const [sessions, setSessions]     = useState([])
  const [experts, setExperts]       = useState([])
  const [founders, setFounders]     = useState([])
  const [profiles, setProfiles]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedProgram, setSelectedProgram] = useState(null)

  // 프로그램 모달
  const [programModal, setProgramModal] = useState(false)
  const [editingProg, setEditingProg]   = useState(null)
  const [progForm, setProgForm]         = useState(emptyProgram())

  // 회차 모달
  const [sessionModal, setSessionModal] = useState(false)
  const [editingSess, setEditingSess]   = useState(null)
  const [sessForm, setSessForm]         = useState(emptySession(null, 1))

  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: pr }, { data: e }, { data: f }, { data: p }] = await Promise.all([
      supabase.from('mentoring_programs').select('*').order('created_at', { ascending: false }),
      supabase.from('experts').select('id, name, field').order('name'),
      supabase.from('founders').select('id, name, phone, email').order('name'),
      supabase.from('profiles').select('id, name').eq('is_active', true),
    ])
    setPrograms(pr || [])
    setExperts(e || [])
    setFounders(f || [])
    setProfiles(p || [])
    setLoading(false)
  }

  async function loadSessions(programId) {
    const { data } = await supabase
      .from('mentoring_sessions')
      .select('*')
      .eq('program_id', programId)
      .order('session_number')
    setSessions(data || [])
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  function setP(k, v) { setProgForm(p => ({ ...p, [k]: v })) }
  function setS(k, v) { setSessForm(p => ({ ...p, [k]: v })) }

  // ── 프로그램 CRUD ──
  function openAddProgram() {
    setEditingProg(null)
    setProgForm(emptyProgram())
    setProgramModal(true)
  }

  function openEditProgram(prog) {
    setEditingProg(prog)
    setProgForm({
      title: prog.title || '', mentor_id: prog.mentor_id || '',
      mentee_name: prog.mentee_name || '', mentee_phone: prog.mentee_phone || '',
      mentee_email: prog.mentee_email || '', total_sessions: prog.total_sessions || 5,
      goal: prog.goal || '', start_date: prog.start_date || '',
      end_date: prog.end_date || '', assignee: prog.assignee || '',
      status: prog.status || '매칭대기',
    })
    setProgramModal(true)
  }

  async function saveProgram() {
    if (!progForm.title.trim()) { alert('멘토링명을 입력해주세요'); return }
    if (!progForm.mentor_id) { alert('멘토를 선택해주세요'); return }
    setSaving(true)
    const payload = {
      title: progForm.title.trim(),
      mentor_id: progForm.mentor_id || null,
      mentee_name: progForm.mentee_name || null,
      mentee_phone: progForm.mentee_phone || null,
      mentee_email: progForm.mentee_email || null,
      total_sessions: Number(progForm.total_sessions) || 5,
      completed_sessions: editingProg?.completed_sessions || 0,
      goal: progForm.goal || null,
      start_date: progForm.start_date || null,
      end_date: progForm.end_date || null,
      assignee: progForm.assignee || null,
      status: progForm.status,
    }
    let error
    if (editingProg) {
      ({ error } = await supabase.from('mentoring_programs').update(payload).eq('id', editingProg.id))
    } else {
      ({ error } = await supabase.from('mentoring_programs').insert(payload))
    }
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setProgramModal(false)
    showToast(editingProg ? '수정되었습니다.' : '멘토링이 등록되었습니다.')
    loadData()
  }

  async function deleteProgram(id) {
    if (!confirm('멘토링 프로그램을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('mentoring_programs').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    if (selectedProgram?.id === id) setSelectedProgram(null)
    showToast('삭제되었습니다.')
    loadData()
  }

  async function updateProgStatus(id, status) {
    const { error } = await supabase.from('mentoring_programs').update({ status }).eq('id', id)
    if (error) { alert('상태 변경 실패: ' + error.message); return }
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  // 멘티 자동채우기
  function selectFounderForProg(id) {
    const f = founders.find(f => f.id === id)
    if (f) setProgForm(p => ({ ...p, mentee_name: f.name, mentee_phone: f.phone || '', mentee_email: f.email || '' }))
  }

  // ── 회차 CRUD ──
  function openAddSession() {
    if (!selectedProgram) return
    const nextNum = sessions.length + 1
    setEditingSess(null)
    setSessForm(emptySession(selectedProgram.id, nextNum))
    setSessionModal(true)
  }

  function openEditSession(sess) {
    setEditingSess(sess)
    setSessForm({
      program_id: sess.program_id, session_number: sess.session_number,
      session_date: sess.session_date || '', content: sess.content || '',
      homework: sess.homework || '', next_goal: sess.next_goal || '',
      status: sess.status || '예정',
    })
    setSessionModal(true)
  }

  async function saveSession() {
    setSaving(true)
    const payload = {
      program_id: sessForm.program_id,
      session_number: sessForm.session_number,
      session_date: sessForm.session_date || null,
      content: sessForm.content || null,
      homework: sessForm.homework || null,
      next_goal: sessForm.next_goal || null,
      status: sessForm.status,
    }
    let error
    if (editingSess) {
      ({ error } = await supabase.from('mentoring_sessions').update(payload).eq('id', editingSess.id))
    } else {
      ({ error } = await supabase.from('mentoring_sessions').insert(payload))
    }
    if (!error) {
      // 완료 회차 수 업데이트
      const { data: allSess } = await supabase.from('mentoring_sessions')
        .select('status').eq('program_id', sessForm.program_id)
      const completedCount = (allSess || []).filter(s => s.status === '완료').length
      await supabase.from('mentoring_programs')
        .update({ completed_sessions: completedCount })
        .eq('id', sessForm.program_id)
    }
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setSessionModal(false)
    showToast(editingSess ? '회차가 수정되었습니다.' : '회차가 등록되었습니다.')
    loadSessions(sessForm.program_id)
    loadData()
  }

  async function deleteSession(sess) {
    if (!confirm('회차 기록을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('mentoring_sessions').delete().eq('id', sess.id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    showToast('삭제되었습니다.')
    loadSessions(sess.program_id)
  }

  function selectProgram(prog) {
    setSelectedProgram(prog)
    setTab('sessions')
    loadSessions(prog.id)
  }

  const expertMap = Object.fromEntries(experts.map(e => [e.id, e]))

  const filteredPrograms = programs.filter(p => {
    const matchSearch = !search || p.title?.includes(search) || p.mentee_name?.includes(search)
      || expertMap[p.mentor_id]?.name?.includes(search)
    const matchStatus = !filterStatus || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total:    programs.length,
    진행중:   programs.filter(p => p.status === '진행중').length,
    완료:     programs.filter(p => p.status === '완료').length,
    매칭대기: programs.filter(p => p.status === '매칭대기').length,
  }

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>
      )}

      <PageHeader title="멘토링 관리" subtitle="멘토-멘티 1:1 다회차 심층 코칭 프로그램" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체" value={`${stats.total}건`} color="blue" />
        <StatCard label="진행중" value={`${stats.진행중}건`} color="teal" />
        <StatCard label="완료" value={`${stats.완료}건`} color="green" />
        <StatCard label="매칭대기" value={`${stats.매칭대기}건`} color="orange" />
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'programs', label: '멘토링 현황' },
          { id: 'sessions', label: selectedProgram ? `회차 관리 — ${selectedProgram.title}` : '회차 관리' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 탭 1: 멘토링 현황 ── */}
      {tab === 'programs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
                  placeholder="멘토링명·멘토·멘티 검색"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">전체 상태</option>
                {PROGRAM_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {canWrite && (
              <button onClick={openAddProgram}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg font-medium"
                style={{ background: '#2E75B6' }}>
                <Plus size={15} /> 멘토링 등록
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['멘토링명', '멘토', '멘티', '목표', '진행 횟수', '시작일', '담당자', '상태', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
                ) : filteredPrograms.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">등록된 멘토링이 없습니다</td></tr>
                ) : filteredPrograms.map(p => {
                  const mentor = expertMap[p.mentor_id]
                  const pct = p.total_sessions ? Math.round(((p.completed_sessions || 0) / p.total_sessions) * 100) : 0
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <button onClick={() => selectProgram(p)}
                          className="text-xs font-medium text-blue-600 hover:underline text-left">
                          {p.title}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{mentor?.name || '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{p.mentee_name || '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[120px] truncate">{p.goal || '-'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-700 font-medium">
                            {p.completed_sessions || 0}/{p.total_sessions}회
                          </span>
                          <div className="w-20 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.start_date || '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.assignee || '-'}</td>
                      <td className="px-4 py-2.5">
                        {canWrite ? (
                          <select value={p.status} onChange={e => updateProgStatus(p.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded border font-medium ${STATUS_COLOR[p.status]}`}>
                            {PROGRAM_STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_COLOR[p.status]}`}>{p.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {canWrite && (
                          <div className="flex gap-1.5">
                            <button onClick={() => openEditProgram(p)} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">수정</button>
                            <button onClick={() => deleteProgram(p.id)} className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50">삭제</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 탭 2: 회차 관리 ── */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          {!selectedProgram ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">멘토링 현황 탭에서 프로그램명을 클릭하면 회차를 관리할 수 있습니다.</p>
            </div>
          ) : (
            <>
              {/* 프로그램 요약 */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 flex flex-wrap gap-4 text-sm">
                <span className="font-semibold text-blue-800">{selectedProgram.title}</span>
                <span className="text-blue-600">멘토: {expertMap[selectedProgram.mentor_id]?.name || '-'}</span>
                <span className="text-blue-600">멘티: {selectedProgram.mentee_name || '-'}</span>
                <span className="text-blue-600">
                  진행: {selectedProgram.completed_sessions || 0}/{selectedProgram.total_sessions}회
                </span>
              </div>

              <div className="flex justify-end">
                {canWrite && (
                  <button onClick={openAddSession}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg font-medium"
                    style={{ background: '#2E75B6' }}>
                    <Plus size={15} /> 회차 기록
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['회차', '날짜', '내용', '과제', '다음 목표', '상태', '관리'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-400">회차 기록이 없습니다</td></tr>
                    ) : sessions.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{s.session_number}회차</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{s.session_date || '-'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[150px] truncate">{s.content || '-'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[120px] truncate">{s.homework || '-'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[120px] truncate">{s.next_goal || '-'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_COLOR[s.status]}`}>{s.status}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {canWrite && (
                            <div className="flex gap-1.5">
                              <button onClick={() => openEditSession(s)} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">수정</button>
                              <button onClick={() => deleteSession(s)} className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50">삭제</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 프로그램 등록/수정 모달 ── */}
      {programModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{editingProg ? '멘토링 수정' : '멘토링 등록'}</h2>
              <button onClick={() => setProgramModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <Field label="멘토링명 *">
                <input className="input-base" value={progForm.title}
                  onChange={e => setP('title', e.target.value)} placeholder="멘토링 프로그램명" />
              </Field>
              <Field label="멘토 (전문가 DB) *">
                <select className="input-base" value={progForm.mentor_id} onChange={e => setP('mentor_id', e.target.value)}>
                  <option value="">멘토 선택</option>
                  {experts.map(e => <option key={e.id} value={e.id}>{e.name} ({e.field})</option>)}
                </select>
              </Field>
              <Field label="멘티 선택 (founders에서)">
                <select className="input-base" onChange={e => selectFounderForProg(e.target.value)} defaultValue="">
                  <option value="">직접 입력 또는 선택</option>
                  {founders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="멘티 이름">
                  <input className="input-base" value={progForm.mentee_name}
                    onChange={e => setP('mentee_name', e.target.value)} placeholder="홍길동" />
                </Field>
                <Field label="멘티 연락처">
                  <input className="input-base" value={progForm.mentee_phone}
                    onChange={e => setP('mentee_phone', e.target.value)} placeholder="010-1234-5678" />
                </Field>
              </div>
              <Field label="멘티 이메일">
                <input type="email" className="input-base" value={progForm.mentee_email}
                  onChange={e => setP('mentee_email', e.target.value)} placeholder="example@email.com" />
              </Field>
              <Field label="멘토링 목표">
                <textarea className="input-base h-20 resize-none" value={progForm.goal}
                  onChange={e => setP('goal', e.target.value)} placeholder="BM 구축, 투자 유치 전략 등" />
              </Field>
              <Field label="총 횟수">
                <input type="number" min="1" className="input-base" value={progForm.total_sessions}
                  onChange={e => setP('total_sessions', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="시작일">
                  <input type="date" className="input-base" value={progForm.start_date}
                    onChange={e => setP('start_date', e.target.value)} />
                </Field>
                <Field label="종료 예정일">
                  <input type="date" className="input-base" value={progForm.end_date}
                    onChange={e => setP('end_date', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="담당자">
                  <select className="input-base" value={progForm.assignee} onChange={e => setP('assignee', e.target.value)}>
                    <option value="">선택</option>
                    {profiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="상태">
                  <select className="input-base" value={progForm.status} onChange={e => setP('status', e.target.value)}>
                    {PROGRAM_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setProgramModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={saveProgram} disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-40"
                style={{ background: '#2E75B6' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 회차 등록/수정 모달 ── */}
      {sessionModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{editingSess ? '회차 수정' : `${sessForm.session_number}회차 기록`}</h2>
              <button onClick={() => setSessionModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="회차 번호">
                  <input type="number" min="1" className="input-base" value={sessForm.session_number}
                    onChange={e => setS('session_number', Number(e.target.value))} />
                </Field>
                <Field label="날짜">
                  <input type="date" className="input-base" value={sessForm.session_date}
                    onChange={e => setS('session_date', e.target.value)} />
                </Field>
              </div>
              <Field label="회차 내용">
                <textarea className="input-base h-24 resize-none" value={sessForm.content}
                  onChange={e => setS('content', e.target.value)} placeholder="이번 회차에서 다룬 내용" />
              </Field>
              <Field label="과제">
                <textarea className="input-base h-16 resize-none" value={sessForm.homework}
                  onChange={e => setS('homework', e.target.value)} placeholder="멘티에게 부여된 과제" />
              </Field>
              <Field label="다음 목표">
                <input className="input-base" value={sessForm.next_goal}
                  onChange={e => setS('next_goal', e.target.value)} placeholder="다음 회차 목표" />
              </Field>
              <Field label="상태">
                <select className="input-base" value={sessForm.status} onChange={e => setS('status', e.target.value)}>
                  {SESSION_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setSessionModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={saveSession} disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-40"
                style={{ background: '#2E75B6' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
