import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ULSAN_REGIONS } from '../../lib/constants'
import { VerdictBadge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Search, UserMinus, BookOpen } from 'lucide-react'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const METHODS = ['방문상담', '화상상담', '전화상담', '이메일', '기타']
const STATUSES = ['상담중', '완료', '후속필요', '보류']

export default function Founders() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')

  const [founders, setFounders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterVerdict, setFilterVerdict] = useState('')
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
    const { data, error } = await supabase
      .from('founders')
      .select('*, consults(*)')
      .not('assignee', 'is', null)
      .neq('assignee', '')
      .order('created_at', { ascending: false })
    if (!error) setFounders(data || [])
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
        ? { ...f, consults: [data, ...(f.consults || [])] }
        : f
    ))
    setSelectedFounder(prev => ({ ...prev, consults: [data, ...(prev.consults || [])] }))
    setNewLog({
      consult_date: today(), method: '', content: '', result: '',
      next_date: '', assignee: selectedFounder.assignee || '', status: '상담중',
    })
    showToast('상담일지가 저장되었습니다.')
  }

  async function handleRelease(id) {
    if (!confirm('창업자 등록을 해제하시겠습니까?')) return
    const { error } = await supabase.from('founders').update({ is_founder: false }).eq('id', id)
    if (error) { alert('해제 실패: ' + error.message); return }
    setFounders(prev => prev.filter(f => f.id !== id))
  }

  const filtered = founders.filter(f => {
    const matchSearch = !search ||
      f.name?.includes(search) ||
      f.phone?.includes(search) ||
      f.biz?.includes(search)
    const matchRegion = !filterRegion || f.region === filterRegion
    const matchVerdict = !filterVerdict || f.verdict === filterVerdict
    return matchSearch && matchRegion && matchVerdict
  })

  const techCount  = founders.filter(f => f.verdict?.includes('테크') && !f.verdict?.includes('혼합')).length
  const localCount = founders.filter(f => f.verdict?.includes('로컬') && !f.verdict?.includes('혼합')).length

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">상담 관리</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 상담자" value={`${founders.length}명`} color="blue" />
        <StatCard label="테크 창업"   value={`${techCount}명`}       color="teal" />
        <StatCard label="로컬 창업"   value={`${localCount}명`}      color="green" />
        <StatCard label="기타"        value={`${founders.length - techCount - localCount}명`} color="orange" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-48"
            placeholder="이름·연락처·기업명 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
          value={filterVerdict}
          onChange={e => setFilterVerdict(e.target.value)}
        >
          <option value="">전체 창업유형</option>
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
            <option key={r} value={r}>{r === '기타(타지역)' ? '타지역' : r}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['이름', '기업명', '연락처', '지역', '창업단계', '창업유형', '담당자', '상담횟수', '상담일지', canWrite ? '관리' : ''].filter(Boolean).map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">담당자가 배정된 상담자가 없습니다</td></tr>
            ) : filtered.map(f => {
              const count = f.consults?.length || 0
              return (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={f.name} />
                      <span className="font-medium text-gray-800 text-xs">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{f.biz || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{f.phone}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {f.region === '기타(타지역)'
                      ? `타지역${f.region_detail ? ` (${f.region_detail})` : ''}`
                      : f.region || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{f.stage || '-'}</td>
                  <td className="px-4 py-2.5"><VerdictBadge verdict={f.verdict} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{f.assignee || '-'}</td>
                  <td className="px-4 py-2.5">
                    {count === 0
                      ? <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">미상담</span>
                      : <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">{count}회</span>
                    }
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => openModal(f)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                    >
                      <BookOpen size={11} /> 상담일지
                    </button>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-2.5">
                      {f.is_founder ? (
                        <button
                          onClick={() => handleRelease(f.id)}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors"
                        >
                          <UserMinus size={11} /> 창업자 해제
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 상담일지 모달 */}
      {showModal && selectedFounder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">상담일지</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* 상담자 정보 */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <div><span className="text-gray-400">이름</span><p className="font-semibold text-gray-800 mt-0.5">{selectedFounder.name}</p></div>
                <div><span className="text-gray-400">기업명</span><p className="font-medium text-gray-700 mt-0.5">{selectedFounder.biz || '-'}</p></div>
                <div><span className="text-gray-400">담당자</span><p className="font-medium text-blue-700 mt-0.5">{selectedFounder.assignee}</p></div>
                <div><span className="text-gray-400">창업유형</span>
                  <div className="mt-0.5">{selectedFounder.verdict ? <VerdictBadge verdict={selectedFounder.verdict} /> : <span className="text-gray-400">-</span>}</div>
                </div>
              </div>

              {/* 이전 상담일지 목록 */}
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
                              {j.content.length > 50 ? j.content.slice(0, 50) + '...' : j.content}
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
