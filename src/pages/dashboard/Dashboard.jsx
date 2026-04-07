import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { VerdictBadge, StatusBadge } from '../../components/common/Badge'
import { Users, MessageSquare, Building2, UserCheck, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ founders: 0, followUp: 0, selectedFirms: 0, mentorings: 0 })
  const [recentConsults, setRecentConsults] = useState([])
  const [verdictDist, setVerdictDist] = useState([])
  const [staffStats, setStaffStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: founders },
          { data: consults },
          { data: selectedFirms },
          { data: mentorings },
        ] = await Promise.all([
          supabase.from('founders').select('*'),
          supabase.from('consults').select('*').order('date', { ascending: false }),
          supabase.from('selected_firms').select('*'),
          supabase.from('mentorings').select('*'),
        ])

        const f = founders || []
        const c = consults || []
        const sf = selectedFirms || []
        const m = mentorings || []

        setStats({
          founders: f.length,
          followUp: c.filter(x => x.status === '후속필요').length,
          selectedFirms: sf.length,
          mentorings: m.length,
        })

        const founderMap = Object.fromEntries(f.map(x => [x.id, x]))
        const recent = c.slice(0, 8).map(con => ({
          ...con,
          founderName: founderMap[con.founder_id]?.name || '-',
          founderVerdict: founderMap[con.founder_id]?.verdict || '',
        }))
        setRecentConsults(recent)

        const vCount = {}
        f.forEach(x => { const v = x.verdict || '미정'; vCount[v] = (vCount[v] || 0) + 1 })
        setVerdictDist(Object.entries(vCount).map(([verdict, count]) => ({ verdict, count })))

        const sMap = {}
        c.forEach(con => {
          if (!con.staff) return
          if (!sMap[con.staff]) sMap[con.staff] = { total: 0, done: 0 }
          sMap[con.staff].total++
          if (con.status === '완료') sMap[con.staff].done++
        })
        setStaffStats(
          Object.entries(sMap)
            .map(([staff, d]) => ({ staff, ...d }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 7)
        )
      } catch (e) {
        console.error('Dashboard load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
  )

  const maxVerdict = Math.max(...verdictDist.map(v => v.count), 1)
  const maxStaff = Math.max(...staffStats.map(s => s.total), 1)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">대시보드</h1>
        <p className="text-sm text-gray-500 mt-0.5">울산경제일자리진흥원 창업지원 통합현황</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="창업 상담" value={`${stats.founders}명`} color="blue" icon={Users} />
        <StatCard label="후속조치 필요" value={`${stats.followUp}건`} sub="상담일지 기준" color="orange" icon={AlertCircle} />
        <StatCard label="선정기업" value={`${stats.selectedFirms}개사`} color="green" icon={Building2} />
        <StatCard label="전문가 상담·멘토링" value={`${stats.mentorings}건`} color="teal" icon={UserCheck} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Consults */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-700 text-sm">최근 상담일지</span>
            <button onClick={() => navigate('/consult')} className="text-xs text-blue-600 hover:underline">전체보기</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">상담자</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">날짜</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">담당</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">상태</th>
                </tr>
              </thead>
              <tbody>
                {recentConsults.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">상담 데이터가 없습니다</td></tr>
                ) : recentConsults.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={c.founderName} />
                        <div>
                          <div className="font-medium text-gray-800 text-xs">{c.founderName}</div>
                          {c.founderVerdict && <VerdictBadge verdict={c.founderVerdict} />}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{c.date}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{c.staff}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {/* Verdict distribution */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="font-semibold text-gray-700 text-sm mb-3">창업 유형 분포</div>
            {verdictDist.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-4">데이터 없음</div>
            ) : verdictDist.map(({ verdict, count }) => (
              <div key={verdict} className="flex items-center gap-2 mb-2">
                <div className="text-xs text-gray-600 min-w-[80px]">{verdict}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(count / maxVerdict * 100)}%`,
                      background: verdict.includes('테크') ? '#2E75B6' : verdict.includes('로컬') ? '#1E5631' : '#8B6914'
                    }}
                  />
                </div>
                <div className="text-xs font-semibold text-gray-700 min-w-[24px] text-right">{count}</div>
              </div>
            ))}
          </div>

          {/* Staff stats */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="font-semibold text-gray-700 text-sm mb-3">담당자별 상담 현황</div>
            {staffStats.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-4">데이터 없음</div>
            ) : staffStats.map(({ staff, total }) => (
              <div key={staff} className="flex items-center gap-2 mb-2.5">
                <Avatar name={staff} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">{staff}</span>
                    <span className="text-xs text-gray-500">{total}건</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.round(total / maxStaff * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
