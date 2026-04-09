import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { VerdictBadge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { callClaudeAPI } from '../../utils/aiConsult'
import { BookOpen, Search, Bot, MessageSquare, BarChart2, Send, Plus, Loader2, Sparkles } from 'lucide-react'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const METHODS = ['방문상담', '화상상담', '전화상담', '이메일', '기타']
const STATUSES = ['상담중', '완료', '후속필요', '보류']

function renderMd(text) {
  return {
    __html: text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>'),
  }
}

export default function Consult() {
  const [founders, setFounders] = useState([])
  const [allConsults, setAllConsults] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [users, setUsers] = useState([])
  const [toast, setToast] = useState('')

  // 상담일지 모달
  const [showModal, setShowModal] = useState(false)
  const [selectedFounder, setSelectedFounder] = useState(null)
  const [newLog, setNewLog] = useState({
    consult_date: today(), method: '', content: '', result: '',
    next_date: '', assignee: '', status: '상담중',
  })
  const [saving, setSaving] = useState(false)

  // AI 패널
  const [aiTab, setAiTab] = useState('analysis')
  const [aiAnalysis, setAiAnalysis] = useState({ loading: false, result: '' })
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState({ loading: false, result: '' })
  const chatEndRef = useRef(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatHistory, chatLoading])

  async function loadData() {
    setLoading(true)
    const [{ data: f }, { data: c }, { data: u }] = await Promise.all([
      supabase
        .from('founders')
        .select('*')
        .not('assignee', 'is', null)
        .neq('assignee', '')
        .order('created_at', { ascending: false }),
      supabase
        .from('consults')
        .select('*')
        .order('date', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
    ])

    const foundersWithConsults = (f || []).map(founder => ({
      ...founder,
      consults: (c || []).filter(con => con.founder_id === founder.id),
    }))
    setFounders(foundersWithConsults)
    setAllConsults(c || [])
    setUsers(u || [])
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function openModal(founder) {
    setSelectedFounder(founder)
    setNewLog({
      consult_date: today(), method: '', content: '', result: '',
      next_date: '', assignee: founder.assignee || '', status: '상담중',
    })
    setShowModal(true)
    setAiTab('analysis')
    setAiAnalysis({ loading: false, result: '' })
    setChatHistory([])
    setChatInput('')
    setChatLoading(false)
    setAiSummary({ loading: false, result: '' })
  }

  async function saveLog() {
    if (!newLog.content.trim()) { alert('상담 내용을 입력해주세요'); return }
    setSaving(true)
    const { data, error } = await supabase
      .from('consults')
      .insert([{
        founder_id: selectedFounder.id,
        date: newLog.consult_date,
        method: newLog.method,
        content: newLog.content,
        result: newLog.result,
        next_date: newLog.next_date || null,
        assignee: newLog.assignee,
        staff: newLog.assignee,
        status: newLog.status,
      }])
      .select()
      .single()
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }

    setFounders(prev => prev.map(f =>
      f.id === selectedFounder.id
        ? { ...f, consults: [data, ...f.consults] }
        : f
    ))
    setSelectedFounder(prev => ({ ...prev, consults: [data, ...prev.consults] }))
    setNewLog({
      consult_date: today(), method: '', content: '', result: '',
      next_date: '', assignee: selectedFounder.assignee || '', status: '상담중',
    })
    showToast('상담일지가 저장되었습니다.')
  }

  // ── AI 분석 ──────────────────────────────────────────────
  async function runAnalysis() {
    if (!newLog.content.trim()) { alert('상담 내용을 먼저 입력해주세요'); return }
    setAiAnalysis({ loading: true, result: '' })

    const founderInfo = [
      `이름: ${selectedFounder.name}`,
      `기업명: ${selectedFounder.biz || '-'}`,
      `지역: ${selectedFounder.region || '-'}`,
      `창업단계: ${selectedFounder.stage || '-'}`,
      `현재 창업유형: ${selectedFounder.verdict || '미판정'}`,
      `총 상담횟수: ${selectedFounder.consults?.length || 0}회`,
    ].join('\n')

    const consultInfo = [
      `상담일: ${newLog.consult_date}`,
      `상담방법: ${newLog.method || '-'}`,
      `상담내용: ${newLog.content}`,
      newLog.result ? `상담결과: ${newLog.result}` : '',
    ].filter(Boolean).join('\n')

    const systemPrompt = `당신은 창업 컨설턴트를 돕는 AI 상담 도우미입니다. 울산경제일자리진흥원의 창업 지원 전문가로서 창업자 정보와 상담 내용을 분석하여 아래 5가지 항목으로 정리해주세요.

**1. 창업유형 판단**: 테크 창업 또는 로컬 창업 여부와 구체적 근거
**2. 추천 지원사업**: 해당 창업자에게 적합한 지원사업 또는 프로그램 (3가지 이내)
**3. 주요 리스크**: 사업 진행 시 주의해야 할 위험 요소 (3가지 이내)
**4. 다음 상담 질문**: 다음 상담에서 확인해야 할 핵심 질문들 (3가지 이내)
**5. 한줄 요약**: 이번 상담의 핵심 내용 한 줄 요약

각 항목을 명확하게 구분하고 실용적인 내용으로 한국어로 답변해주세요.`

    try {
      const result = await callClaudeAPI(
        systemPrompt,
        `[창업자 정보]\n${founderInfo}\n\n[이번 상담 내용]\n${consultInfo}`,
      )
      setAiAnalysis({ loading: false, result })
    } catch (e) {
      setAiAnalysis({ loading: false, result: `AI 분석 중 오류가 발생했습니다.\n${e.message}` })
    }
  }

  // ── AI 채팅 ──────────────────────────────────────────────
  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')

    const newHistory = [...chatHistory, { role: 'user', content: userMsg }]
    setChatHistory(newHistory)
    setChatLoading(true)

    const founderCtx = `창업자: ${selectedFounder.name} / 기업: ${selectedFounder.biz || '-'} / 창업유형: ${selectedFounder.verdict || '미판정'} / 지역: ${selectedFounder.region || '-'} / 창업단계: ${selectedFounder.stage || '-'}`
    const systemPrompt = `당신은 창업 컨설턴트를 돕는 AI 상담 도우미입니다. 울산경제일자리진흥원의 창업 지원 전문가로서 컨설턴트의 질문에 답변하고 상담을 지원합니다.

[현재 상담 창업자 정보]
${founderCtx}${newLog.content ? `\n\n[이번 상담 내용]\n${newLog.content}` : ''}

한국어로 친절하고 전문적으로 답변해주세요.`

    try {
      const result = await callClaudeAPI(systemPrompt, userMsg, chatHistory)
      setChatHistory([...newHistory, { role: 'assistant', content: result }])
    } catch (e) {
      setChatHistory([...newHistory, { role: 'assistant', content: `오류가 발생했습니다: ${e.message}` }])
    } finally {
      setChatLoading(false)
    }
  }

  function appendToContent(text) {
    setNewLog(p => ({
      ...p,
      content: p.content
        ? `${p.content}\n\n[AI 제안]\n${text}`
        : `[AI 제안]\n${text}`,
    }))
  }

  // ── 종합 분석 ─────────────────────────────────────────────
  async function runSummary() {
    const consults = selectedFounder.consults || []
    if (!consults.length) { alert('상담 이력이 없습니다'); return }
    setAiSummary({ loading: true, result: '' })

    const founderInfo = [
      `이름: ${selectedFounder.name}`,
      `기업명: ${selectedFounder.biz || '-'}`,
      `지역: ${selectedFounder.region || '-'}`,
      `창업단계: ${selectedFounder.stage || '-'}`,
      `현재 창업유형: ${selectedFounder.verdict || '미판정'}`,
    ].join('\n')

    const history = [...consults]
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map((c, i) => {
        const parts = [`${i + 1}. [${c.date?.slice(0, 10) || '날짜미상'}]`]
        if (c.method) parts.push(c.method)
        if (c.content) parts.push(c.content)
        if (c.result) parts.push(`→ ${c.result}`)
        return parts.join(' | ')
      })
      .join('\n')

    const systemPrompt = `당신은 창업 컨설턴트를 돕는 AI 분석 도우미입니다. 창업자의 전체 상담 이력을 종합적으로 분석하여 아래 항목으로 정리해주세요.

**강점** (불릿 포인트, 3가지 이내): 창업자의 주요 강점
**약점/개선점** (불릿 포인트, 3가지 이내): 보완이 필요한 영역
**창업유형 최종 판단**: 테크 창업 또는 로컬 창업 권고와 근거
**종합 의견**: 전반적인 평가 및 향후 지원 방향 (2~3문장)

한국어로 명확하게 작성해주세요.`

    try {
      const result = await callClaudeAPI(
        systemPrompt,
        `[창업자 정보]\n${founderInfo}\n\n[전체 상담 이력 (${consults.length}건)]\n${history}`,
        [],
        2000,
      )
      setAiSummary({ loading: false, result })
    } catch (e) {
      setAiSummary({ loading: false, result: `종합 분석 중 오류가 발생했습니다.\n${e.message}` })
    }
  }

  const filtered = founders.filter(f => {
    const matchSearch = !search ||
      f.name?.includes(search) ||
      f.biz?.includes(search) ||
      f.assignee?.includes(search)
    const matchAssignee = !filterAssignee || f.assignee === filterAssignee
    return matchSearch && matchAssignee
  })

  const doneCount = allConsults.filter(c => c.status === '완료').length
  const followCount = allConsults.filter(c => c.status === '후속필요').length
  const staffSet = new Set(founders.map(f => f.assignee).filter(Boolean))

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">상담일지</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 상담자" value={`${founders.length}명`} color="blue" />
        <StatCard label="완료" value={`${doneCount}건`} color="green" />
        <StatCard label="후속 필요" value={`${followCount}건`} color="orange" />
        <StatCard label="담당자 수" value={`${staffSet.size}명`} color="teal" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-full"
            placeholder="이름·기업명 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
        >
          <option value="">전체 담당자</option>
          {users.map(u => (
            <option key={u.id} value={u.name}>{u.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['상담자명', '기업명', '창업유형', '지역', '담당자', '상담횟수', '최근상담일', '상담일지'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                담당자가 배정된 상담자가 없습니다.<br />
                <span className="text-xs text-gray-300">상담 접수에서 담당자를 지정하면 여기에 표시됩니다.</span>
              </td></tr>
            ) : filtered.map(f => {
              const count = f.consults?.length || 0
              const sortedConsults = [...(f.consults || [])].sort((a, b) =>
                (b.date || '').localeCompare(a.date || '')
              )
              const latestDate = sortedConsults[0]?.date?.slice(0, 10) || null
              return (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={f.name} />
                      <span className="font-medium text-gray-800 text-xs">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{f.biz || '-'}</td>
                  <td className="px-4 py-2.5">
                    {f.verdict ? <VerdictBadge verdict={f.verdict} /> : <span className="text-xs text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {f.region === '기타(타지역)'
                      ? `타지역${f.region_detail ? ` (${f.region_detail})` : ''}`
                      : (f.region || '-')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {f.assignee}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {count === 0
                      ? <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">미상담</span>
                      : <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">{count}회</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{latestDate || '-'}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => openModal(f)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                    >
                      <BookOpen size={11} /> 상담일지
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── 상담일지 모달 (2-column) ─────────────────────────── */}
      {showModal && selectedFounder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col">

            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-base font-bold text-gray-800">상담일지</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >×</button>
            </div>

            {/* 모달 바디 - 2열 */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

              {/* ── 왼쪽: 상담일지 작성 (55%) ── */}
              <div className="lg:w-[55%] overflow-y-auto px-6 py-4 space-y-5 border-r border-gray-100">

                {/* 창업자 정보 */}
                <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  <div>
                    <span className="text-gray-400">이름</span>
                    <p className="font-semibold text-gray-800 mt-0.5">{selectedFounder.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">기업명</span>
                    <p className="font-medium text-gray-700 mt-0.5">{selectedFounder.biz || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">담당자</span>
                    <p className="font-medium text-blue-700 mt-0.5">{selectedFounder.assignee}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">창업유형</span>
                    <div className="mt-0.5">
                      {selectedFounder.verdict
                        ? <VerdictBadge verdict={selectedFounder.verdict} />
                        : <span className="text-gray-400">-</span>}
                    </div>
                  </div>
                </div>

                {/* 이전 상담일지 */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    이전 상담일지 ({selectedFounder.consults?.length || 0}건)
                  </p>
                  {!selectedFounder.consults?.length ? (
                    <div className="text-center py-8 text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      아직 상담 내역이 없습니다. 첫 상담을 등록해주세요.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {[...selectedFounder.consults]
                        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                        .map(j => (
                          <div key={j.id} className="border border-gray-100 rounded-xl p-3 bg-white text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-700">{j.date?.slice(0, 10)}</span>
                              <div className="flex gap-1.5">
                                {j.method && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{j.method}</span>}
                                {(j.assignee || j.staff) && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{j.assignee || j.staff}</span>}
                                {j.status && <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full">{j.status}</span>}
                              </div>
                            </div>
                            {j.content && (
                              <p className="text-gray-600 leading-relaxed">
                                {j.content.length > 80 ? j.content.slice(0, 80) + '...' : j.content}
                              </p>
                            )}
                            {j.result && <p className="text-blue-600">→ {j.result}</p>}
                            {j.next_date && <p className="text-orange-500 font-medium">다음 상담: {j.next_date}</p>}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* 새 상담일지 등록 */}
                <div className="border border-blue-100 rounded-xl p-4 space-y-3 bg-blue-50/30">
                  <p className="text-xs font-bold text-blue-700">새 상담일지 등록</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">상담일시</label>
                      <input type="date" className="form-input"
                        value={newLog.consult_date}
                        onChange={e => setNewLog(p => ({ ...p, consult_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">상담방법</label>
                      <select className="form-input"
                        value={newLog.method}
                        onChange={e => setNewLog(p => ({ ...p, method: e.target.value }))}
                      >
                        <option value="">선택</option>
                        {METHODS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
                      <input className="form-input"
                        value={newLog.assignee}
                        onChange={e => setNewLog(p => ({ ...p, assignee: e.target.value }))}
                        placeholder="담당자명"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">상태</label>
                      <select className="form-input"
                        value={newLog.status}
                        onChange={e => setNewLog(p => ({ ...p, status: e.target.value }))}
                      >
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">상담내용 *</label>
                    <textarea className="form-input" rows={3}
                      value={newLog.content}
                      onChange={e => setNewLog(p => ({ ...p, content: e.target.value }))}
                      placeholder="상담 내용을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">상담결과</label>
                    <textarea className="form-input" rows={2}
                      value={newLog.result}
                      onChange={e => setNewLog(p => ({ ...p, result: e.target.value }))}
                      placeholder="상담 결과 및 특이사항"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">다음 상담 예정일 (선택)</label>
                    <input type="date" className="form-input"
                      value={newLog.next_date}
                      onChange={e => setNewLog(p => ({ ...p, next_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* ── 오른쪽: AI 상담 도우미 (45%) ── */}
              <div className="lg:w-[45%] flex flex-col bg-slate-50/60 min-h-0">

                {/* AI 탭 헤더 */}
                <div className="flex border-b border-gray-200 px-4 pt-3 gap-1 flex-shrink-0 bg-white">
                  {[
                    { key: 'analysis', icon: Bot, label: 'AI 분석' },
                    { key: 'chat',     icon: MessageSquare, label: 'AI 채팅' },
                    { key: 'summary',  icon: BarChart2, label: '종합 분석' },
                  ].map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      onClick={() => setAiTab(key)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                        aiTab === key
                          ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  ))}
                </div>

                {/* 탭 콘텐츠 */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">

                  {/* ── Tab 1: AI 분석 ── */}
                  {aiTab === 'analysis' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          상담 내용을 입력한 뒤 분석을 실행하세요.
                        </p>
                        <button
                          onClick={runAnalysis}
                          disabled={aiAnalysis.loading}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
                          style={{ background: '#2E75B6' }}
                        >
                          {aiAnalysis.loading
                            ? <><Loader2 size={11} className="animate-spin" /> 분석 중...</>
                            : <><Sparkles size={11} /> AI 분석 실행</>
                          }
                        </button>
                      </div>

                      {aiAnalysis.loading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                          <Loader2 size={28} className="animate-spin text-blue-400" />
                          <p className="text-xs">AI가 상담 내용을 분석하고 있습니다...</p>
                        </div>
                      )}

                      {!aiAnalysis.loading && aiAnalysis.result && (
                        <div className="bg-white rounded-xl border border-blue-100 p-4 text-xs leading-relaxed text-gray-700"
                          dangerouslySetInnerHTML={renderMd(aiAnalysis.result)}
                        />
                      )}

                      {!aiAnalysis.loading && !aiAnalysis.result && (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
                          <Bot size={32} />
                          <p className="text-xs">분석 결과가 여기에 표시됩니다</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Tab 2: AI 채팅 ── */}
                  {aiTab === 'chat' && (
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* 메시지 목록 */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chatHistory.length === 0 && !chatLoading && (
                          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
                            <MessageSquare size={28} />
                            <p className="text-xs text-center">창업자에 대해 궁금한 점을<br/>자유롭게 질문하세요</p>
                          </div>
                        )}
                        {chatHistory.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                              msg.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border border-gray-200 text-gray-700'
                            }`}>
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              {msg.role === 'assistant' && (
                                <button
                                  onClick={() => appendToContent(msg.content)}
                                  className="mt-2 flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                                >
                                  <Plus size={9} /> 상담일지에 추가
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                              <Loader2 size={14} className="animate-spin text-blue-400" />
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* 입력창 */}
                      <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
                        <input
                          className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="질문을 입력하세요 (Enter 전송)"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() }
                          }}
                          disabled={chatLoading}
                        />
                        <button
                          onClick={sendChat}
                          disabled={chatLoading || !chatInput.trim()}
                          className="p-2 rounded-lg text-white disabled:opacity-40 transition-colors"
                          style={{ background: '#2E75B6' }}
                        >
                          <Send size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Tab 3: 종합 분석 ── */}
                  {aiTab === 'summary' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          전체 상담 이력 ({selectedFounder.consults?.length || 0}건)을 종합 분석합니다.
                        </p>
                        <button
                          onClick={runSummary}
                          disabled={aiSummary.loading}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
                          style={{ background: '#059669' }}
                        >
                          {aiSummary.loading
                            ? <><Loader2 size={11} className="animate-spin" /> 분석 중...</>
                            : <><BarChart2 size={11} /> 종합 분석 실행</>
                          }
                        </button>
                      </div>

                      {aiSummary.loading && (
                        <div className="space-y-2">
                          <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400">
                            <Loader2 size={28} className="animate-spin text-green-400" />
                            <p className="text-xs">전체 상담 이력을 종합 분석하고 있습니다...</p>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-green-400 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                          </div>
                        </div>
                      )}

                      {!aiSummary.loading && aiSummary.result && (
                        <div className="bg-white rounded-xl border border-green-100 p-4 text-xs leading-relaxed text-gray-700"
                          dangerouslySetInnerHTML={renderMd(aiSummary.result)}
                        />
                      )}

                      {!aiSummary.loading && !aiSummary.result && (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
                          <BarChart2 size={32} />
                          <p className="text-xs">종합 분석 결과가 여기에 표시됩니다</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >닫기</button>
              <button
                onClick={saveLog}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ background: '#2E75B6' }}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
