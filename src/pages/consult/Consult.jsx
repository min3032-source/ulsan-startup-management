import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { VerdictBadge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { BookOpen, Search, ExternalLink } from 'lucide-react'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const METHODS = ['방문상담', '화상상담', '전화상담', '이메일', '기타']
const STATUSES = ['상담중', '완료', '후속필요', '보류']

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

  useEffect(() => { loadData() }, [])

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
    setTimeout(() => setToast(''), 4000)
  }

  function openModal(founder) {
    setSelectedFounder(founder)
    setNewLog({
      consult_date: today(), method: '', content: '', result: '',
      next_date: '', assignee: founder.assignee || '', status: '상담중',
    })
    setShowModal(true)
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

  // ── AI 상담 도우미 (claude.ai 연동) ──────────────────────
  function buildPrompt(extraPrompt) {
    if (!selectedFounder) return ''

    const info = [
      `이름: ${selectedFounder.name}`,
      `기업명: ${selectedFounder.biz || '-'}`,
      `지역: ${selectedFounder.region || '-'}`,
      `창업단계: ${selectedFounder.stage || '-'}`,
      `창업유형: ${selectedFounder.verdict || '미판정'}`,
      `담당자: ${selectedFounder.assignee || '-'}`,
      `총 상담횟수: ${selectedFounder.consults?.length || 0}회`,
    ].join('\n')

    const consult = [
      `상담일: ${newLog.consult_date}`,
      newLog.method  && `상담방법: ${newLog.method}`,
      newLog.content && `내용: ${newLog.content}`,
      newLog.result  && `결과: ${newLog.result}`,
    ].filter(Boolean).join('\n')

    return `[창업자 정보]\n${info}\n\n[이번 상담 내용]\n${consult}\n\n${extraPrompt}`
  }

  async function openAI(extraPrompt) {
    const text = buildPrompt(extraPrompt)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard API 미지원 시 fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    window.open('https://claude.ai', '_blank')
    showToast('상담자 정보가 복사되었습니다. Claude 창에 붙여넣기(Ctrl+V) 해주세요!')
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
      {/* 토스트 */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-violet-700 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-xs">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">상담일지</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 상담자" value={`${founders.length}명`} color="blue" />
        <StatCard label="완료" value={`${doneCount}건`} color="green" />
        <StatCard label="후속 필요" value={`${followCount}건`} color="orange" />
        <StatCard label="담당자 수" value={`${staffSet.size}명`} color="teal" />
      </div>

      {/* 검색 + 담당자 필터 */}
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

      {/* 목록 테이블 */}
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

      {/* ── 상담일지 모달 ── */}
      {showModal && selectedFounder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">상담일지</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

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
                  <div className="space-y-2 max-h-48 overflow-y-auto">
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

                {/* ── AI 상담 도우미 ── */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => openAI(
                      '위 창업자의 상담 내용을 분석하고, 창업유형 판단·추천 지원사업·주요 리스크·다음 상담에서 확인할 질문을 정리해주세요.'
                    )}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90"
                    style={{ background: '#7c3aed' }}
                  >
                    🤖 AI 분석 요청
                    <ExternalLink size={13} className="opacity-70" />
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => openAI('위 상담 내용을 간결하게 요약하고, 핵심 이슈 3가지를 정리해주세요.')}
                      className="py-1.5 text-xs font-medium rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors"
                    >
                      📋 상담 요약해줘
                    </button>
                    <button
                      onClick={() => openAI('위 창업자에게 적합한 정부·지자체 지원사업 3가지를 추천하고, 각 사업의 특징과 신청 방법을 알려주세요.')}
                      className="py-1.5 text-xs font-medium rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors"
                    >
                      💡 지원사업 추천
                    </button>
                    <button
                      onClick={() => openAI('위 창업자의 사업에서 예상되는 주요 리스크 3가지를 분석하고, 각 리스크별 대응 방안을 제안해주세요.')}
                      className="py-1.5 text-xs font-medium rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors"
                    >
                      ⚠️ 리스크 분석
                    </button>
                  </div>
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

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
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
