import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ULSAN_REGIONS } from '../../lib/constants'
import { VerdictBadge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Search, UserMinus } from 'lucide-react'

export default function Founders() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')

  const [founders, setFounders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterVerdict, setFilterVerdict] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('founders')
      .select('*')
      .eq('is_founder', true)
      .order('date', { ascending: false })
    if (!error) setFounders(data || [])
    setLoading(false)
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
      <h1 className="text-xl font-bold text-gray-800">창업자 관리</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 창업자" value={`${founders.length}명`} color="blue" />
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
              {['이름', '기업명', '연락처', '지역', '창업단계', '창업유형', '성별', '담당자', '등록일', canWrite ? '관리' : ''].filter(Boolean).map(h => (
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
                <td className="px-4 py-2.5 text-xs text-gray-500">{f.gender || '-'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{f.assignee || '-'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400">{f.date || '-'}</td>
                {canWrite && (
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleRelease(f.id)}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors"
                    >
                      <UserMinus size={11} /> 해제
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
