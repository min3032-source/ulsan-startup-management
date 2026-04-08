import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { today } from '../../lib/constants'
import { VerdictBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { BookOpen, Search } from 'lucide-react'

export default function Consult() {
  const [founders, setFounders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

  // 상담일지 모달
  const [journalOpen, setJournalOpen] = useState(false)
  const [journalFounder, setJournalFounder] = useState(null)
  const [journals, setJournals] = useState([])
  const [journalsLoading, setJournalsLoading] = useState(false)
  const [journalForm, setJournalForm] = useState({
    date: today(), method: '', content: '', result: '', status: '상담중', next_date: '', staff: '',
  })
  const [journalSaving, setJournalSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('founders')
      .select('*, consults(*)')
      .not('assignee', 'is', null)
      .neq('assignee', '')
      .order('date', { ascending: false })
    setFounders(data || [])
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function openJournal(f) {
    setJournalFounder(f)
    setJournalForm({
      date: today(), method: '', content: '', result: '',
      status: '상담중', next_date: '', staff: f.assignee || '',
    })
    setJournalOpen(true)
    setJournalsLoading(true)
    const { data } = await supabase
      .from('consults')
      .select('*')
      .eq('founder_id', f.id)
      .order('date', { ascending: false })
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
    setFounders(prev => prev.map(f =>
      f.id === journalFounder.id
        ? { ...f, consults: [...(f.consults || []), data] }
        : f
    ))
    setJournalForm({
      date: today(), method: '', content: '', result: '',
      status: '상담중', next_date: '', staff: journalFounder.assignee || '',
    })
    showToast('상담일지가 저장되었습니다.')
  }

  const filtered = founders.filter(f =>
    !search ||
    f.name?.includes(search) ||
    f.biz?.includes(search) ||
    f.assignee?.includes(search)
  )

  const totalConsults = founders.reduce((sum, f) => sum + (f.consults?.length || 0), 0)
  const consultedCount = founders.filter(f => (f.consults?.length || 0) > 0).length

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">상담일지</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="담당자 배정" value={`${founders.length}명`} color="blue" />
        <StatCard label="상담 완료" value={`${consultedCount}명`} color="green" />
        <StatCard label="미상담" value={`${founders.length - consultedCount}명`} color="orange" />
        <StatCard label="전체 상담 건수" value={`${totalConsults}건`} color="teal" />
      </div>

      <div className="relative w-52">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-full"
          placeholder="이름·기업명·담당자 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['상담자명', '기업명', '창업유형', '지역', '담당자', '상담횟수', '최근상담일', '관리'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">담당자가 배정된 상담자가 없습니다</td></tr>
            ) : filtered.map(f => {
              const count = f.consults?.length || 0
              const sorted = [...(f.consults || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              const latestDate = sorted[0]?.date?.slice(0, 10) || null
              return (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={f.name} />
                      <span className="font-medium text-gray-800 text-xs">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{f.biz || '-'}</td>
                  <td className="px-4 py-2.5">
                    {f.verdict
                      ? <VerdictBadge verdict={f.verdict} />
                      : <span className="text-xs text-gray-400">-</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {f.region === '기타(타지역)'
                      ? `타지역${f.region_detail ? ` (${f.region_detail})` : ''}`
                      : (f.region || '-')}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{f.assignee}</td>
                  <td className="px-4 py-2.5">
                    {count === 0 ? (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded font-medium">미상담</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded font-medium">{count}회</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{latestDate || '-'}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => openJournal(f)}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
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

      {/* 상담일지 모달 */}
      <Modal
        isOpen={journalOpen}
        onClose={() => setJournalOpen(false)}
        title={`상담일지 — ${journalFounder?.name || ''}`}
        wide
      >
        {journalFounder && (
          <div className="space-y-4">
            {/* 상단: 상담자 정보 (읽기전용) */}
            <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 border border-gray-200">
              <span><strong>상담자:</strong> {journalFounder.name}</span>
              {journalFounder.biz && <span><strong>기업명:</strong> {journalFounder.biz}</span>}
              <span><strong>담당자:</strong> {journalFounder.assignee}</span>
            </div>

            {/* 중단: 이전 상담일지 목록 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">이전 상담일지</p>
              {journalsLoading ? (
                <div className="text-center py-4 text-gray-400 text-xs">로딩 중...</div>
              ) : journals.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  아직 상담 내역이 없습니다. 첫 상담을 등록해주세요.
                </div>
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

            {/* 하단: 새 상담일지 등록 */}
            <div className="border border-blue-100 rounded-xl p-4 space-y-3 bg-blue-50/30">
              <p className="text-xs font-semibold text-blue-700">새 상담일지 등록</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">상담일시</label>
                  <input
                    type="date"
                    className="form-input"
                    value={journalForm.date}
                    onChange={e => setJournalForm(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">상담방법</label>
                  <select
                    className="form-input"
                    value={journalForm.method}
                    onChange={e => setJournalForm(p => ({ ...p, method: e.target.value }))}
                  >
                    <option value="">선택</option>
                    {['방문상담','화상상담','전화상담','이메일','기타'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
                <input
                  className="form-input bg-gray-50 text-gray-600"
                  value={journalForm.staff}
                  onChange={e => setJournalForm(p => ({ ...p, staff: e.target.value }))}
                  placeholder="담당자명"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">상태</label>
                  <select
                    className="form-input"
                    value={journalForm.status}
                    onChange={e => setJournalForm(p => ({ ...p, status: e.target.value }))}
                  >
                    {['상담중','완료','후속필요','보류'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">다음 상담 예정일 (선택)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={journalForm.next_date}
                    onChange={e => setJournalForm(p => ({ ...p, next_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">상담내용</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={journalForm.content}
                  onChange={e => setJournalForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="상담 내용을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">상담결과</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={journalForm.result}
                  onChange={e => setJournalForm(p => ({ ...p, result: e.target.value }))}
                  placeholder="상담 결과 및 특이사항"
                />
              </div>
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
