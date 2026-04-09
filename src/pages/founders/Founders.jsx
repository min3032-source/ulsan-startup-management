import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ULSAN_REGIONS } from '../../lib/constants'
import { VerdictBadge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Search, UserCheck, UserMinus } from 'lucide-react'

const CONSULT_STATUS_COLORS = {
  '대기중': 'bg-amber-100 text-amber-700',
  '상담중': 'bg-blue-100 text-blue-700',
  '완료':   'bg-green-100 text-green-700',
  '보류':   'bg-gray-100 text-gray-500',
}

export default function Founders() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')

  const [founders, setFounders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterVerdict, setFilterVerdict] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('founders')
      .select('*, consults(*)')
      .order('created_at', { ascending: false })
    if (!error) setFounders(data || [])
    setLoading(false)
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
              {['이름', '연락처', '창업유형', '지역', '창업단계', '담당자', '상담상태', '상담횟수', '창업자등록'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">등록된 상담자가 없습니다</td></tr>
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
                  <td className="px-4 py-2.5 text-xs text-gray-500">{f.phone}</td>
                  <td className="px-4 py-2.5"><VerdictBadge verdict={f.verdict} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {f.region === '기타(타지역)'
                      ? `타지역${f.region_detail ? ` (${f.region_detail})` : ''}`
                      : f.region || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{f.stage || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{f.assignee || '-'}</td>
                  <td className="px-4 py-2.5">
                    {f.consult_status
                      ? <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CONSULT_STATUS_COLORS[f.consult_status] || 'bg-gray-100 text-gray-500'}`}>
                          {f.consult_status}
                        </span>
                      : <span className="text-xs text-gray-400">-</span>
                    }
                  </td>
                  <td className="px-4 py-2.5">
                    {count === 0
                      ? <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">미상담</span>
                      : <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">{count}회</span>
                    }
                  </td>
                  <td className="px-4 py-2.5">
                    {f.is_founder ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-green-600 font-medium">창업자 ✓</span>
                        {canWrite && (
                          <button
                            onClick={() => handleCancelFounder(f.id)}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors"
                          >
                            <UserMinus size={11} /> 취소
                          </button>
                        )}
                      </div>
                    ) : canWrite ? (
                      <button
                        onClick={() => handleRegisterFounder(f.id)}
                        className="flex items-center gap-1 text-xs px-2 py-0.5 text-white rounded transition-colors"
                        style={{ background: '#1E5631' }}
                      >
                        <UserCheck size={11} /> 창업자 등록
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
