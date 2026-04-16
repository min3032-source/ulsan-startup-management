import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ULSAN_REGIONS, getVerdictBadgeClass } from '../../lib/constants'
import StatCard from '../../components/common/StatCard'
import { VerdictBadge, StatusBadge } from '../../components/common/Badge'

export default function Stats() {
  const [founders, setFounders] = useState([])
  const [supports, setSupports] = useState([])
  const [selectedFirms, setSelectedFirms] = useState([])
  const [growths, setGrowths] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [{ data: f }, { data: s }, { data: sf }, { data: g }] = await Promise.all([
          supabase.from('founders').select('*'),
          supabase.from('support_items').select('*'),
          supabase.from('selected_firms').select('*'),
          supabase.from('growths').select('*'),
        ])
        setFounders(f || [])
        setSupports(s || [])
        setSelectedFirms(sf || [])
        setGrowths(g || [])
      } catch (e) {
        console.error('Stats load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>

  // Region stats
  const regionStats = ULSAN_REGIONS.map(r => ({
    region: r,
    count: founders.filter(f => f.region === r).length
  })).filter(r => r.count > 0)

  // Gender stats
  const maleCount = founders.filter(f => f.gender === '남').length
  const femaleCount = founders.filter(f => f.gender === '여').length

  // Verdict stats
  const verdictStats = {}
  founders.forEach(f => {
    const v = f.verdict || '미정'
    verdictStats[v] = (verdictStats[v] || 0) + 1
  })

  // Year stats from consults
  const yearStats = {}
  founders.forEach(f => {
    const y = f.date?.slice(0, 4)
    if (y) yearStats[y] = (yearStats[y] || 0) + 1
  })

  // Program stats
  const allPrograms = [...new Set([
    ...supports.map(s => s.program),
    ...selectedFirms.map(f => f.program),
  ])].filter(Boolean)

  const programStats = allPrograms.map(p => {
    const supList = supports.filter(s => s.program === p)
    const sfList = selectedFirms.filter(f => f.program === p)
    const selected = supList.filter(s => s.result === '선정').length + sfList.length
    const total = supList.length + sfList.length
    const totalAmt = [...supList.filter(s => s.result === '선정'), ...sfList].reduce(
      (a, x) => a + (Number(x.amount) || 0), 0
    )
    return { program: p, total, selected, totalAmt }
  }).sort((a, b) => b.total - a.total)

  const maxRegion = Math.max(...regionStats.map(r => r.count), 1)
  const maxVerdict = Math.max(...Object.values(verdictStats), 1)

  const totalAmt = supports.filter(s => s.result === '선정').reduce((a, s) => a + (Number(s.amount) || 0), 0)
    + selectedFirms.reduce((a, f) => a + (Number(f.amount) || 0), 0)
  const totalEmp = (() => {
    const latestByFounder = {}
    growths.forEach(g => {
      const key = g.founder_id || g.company_id
      if (!latestByFounder[key] || g.year > latestByFounder[key].year) latestByFounder[key] = g
    })
    return Object.values(latestByFounder).reduce((a, g) => a + (Number(g.employees) || 0), 0)
  })()

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">통계 현황</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="창업 상담" value={`${founders.length}명`} color="blue" />
        <StatCard label="지원사업 연계" value={`${supports.length + selectedFirms.length}건`} color="green" />
        <StatCard label="총 지원금액" value={`${totalAmt >= 10000 ? (totalAmt / 10000).toFixed(1) + '억' : totalAmt.toLocaleString() + '만'}`} color="teal" />
        <StatCard label="고용 창출" value={`${totalEmp}명`} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Region stats */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="font-semibold text-gray-700 text-sm mb-4">지역별 창업 상담 현황</div>
          {regionStats.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">데이터 없음</div>
          ) : regionStats.map(({ region, count }) => (
            <div key={region} className="flex items-center gap-3 mb-3">
              <div className="text-xs text-gray-600 min-w-[90px]">{region}</div>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.round(count / maxRegion * 100)}%`, background: '#2E75B6' }}
                />
              </div>
              <div className="text-xs font-bold text-blue-700 min-w-[28px] text-right">{count}명</div>
            </div>
          ))}
        </div>

        {/* Gender + Verdict */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="font-semibold text-gray-700 text-sm mb-4">성별 현황</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-700">{maleCount}명</div>
                <div className="text-xs text-gray-500 mt-1">남성</div>
                <div className="text-xs text-gray-400">{founders.length > 0 ? Math.round(maleCount / founders.length * 100) : 0}%</div>
              </div>
              <div className="text-center p-4 bg-rose-50 rounded-xl">
                <div className="text-2xl font-bold text-rose-600">{femaleCount}명</div>
                <div className="text-xs text-gray-500 mt-1">여성</div>
                <div className="text-xs text-gray-400">{founders.length > 0 ? Math.round(femaleCount / founders.length * 100) : 0}%</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="font-semibold text-gray-700 text-sm mb-4">창업 유형별 현황</div>
            {Object.entries(verdictStats).length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-2">데이터 없음</div>
            ) : Object.entries(verdictStats).map(([verdict, count]) => (
              <div key={verdict} className="flex items-center gap-3 mb-2">
                <div className="text-xs text-gray-600 min-w-[80px]">{verdict}</div>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(count / maxVerdict * 100)}%`,
                      background: verdict.includes('테크') ? '#2E75B6' : verdict.includes('로컬') ? '#1E5631' : '#8B6914'
                    }}
                  />
                </div>
                <div className="text-xs font-bold text-gray-700 min-w-[24px] text-right">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Year stats */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="font-semibold text-gray-700 text-sm mb-4">연도별 접수 현황</div>
        <div className="flex items-end gap-4">
          {Object.entries(yearStats).sort().map(([year, count]) => {
            const maxYear = Math.max(...Object.values(yearStats), 1)
            const h = Math.max(20, Math.round(count / maxYear * 100))
            return (
              <div key={year} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-blue-700">{count}명</span>
                <div style={{ height: `${h}px`, width: '40px', background: '#2E75B6', borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                <span className="text-xs text-gray-500">{year}</span>
              </div>
            )
          })}
          {Object.keys(yearStats).length === 0 && (
            <div className="text-gray-400 text-sm">데이터 없음</div>
          )}
        </div>
      </div>

      {/* ── 선정기업 현황 ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">선정기업 현황</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="전체 선정기업" value={`${selectedFirms.length}개사`} color="blue" />
          <StatCard label="지원 진행중" value={`${selectedFirms.filter(f => f.status === '지원중').length}개사`} color="orange" />
          <StatCard label="지원 완료" value={`${selectedFirms.filter(f => f.status === '완료').length}개사`} color="green" />
          <StatCard label="총 지원금액"
            value={(() => { const t = selectedFirms.reduce((a, f) => a + (Number(f.amount) || 0), 0); return t >= 10000 ? (t/10000).toFixed(1)+'억' : t.toLocaleString()+'만' })()} color="teal" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 연도별 선정기업 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="font-semibold text-gray-700 text-sm mb-4">연도별 선정기업 수</div>
            {(() => {
              const yearMap = {}
              selectedFirms.forEach(f => { const y = f.start_date?.slice(0,4); if (y) yearMap[y] = (yearMap[y]||0)+1 })
              const entries = Object.entries(yearMap).sort()
              const maxV = Math.max(...entries.map(([,v])=>v), 1)
              return entries.length === 0
                ? <div className="text-center text-gray-400 text-sm py-4">데이터 없음</div>
                : <div className="flex items-end gap-4">{entries.map(([y, cnt]) => (
                    <div key={y} className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-blue-700">{cnt}개</span>
                      <div style={{ height: `${Math.max(20, Math.round(cnt/maxV*80))}px`, width:'36px', background:'#2E75B6', borderRadius:'4px 4px 0 0', opacity:0.85 }} />
                      <span className="text-xs text-gray-500">{y}</span>
                    </div>
                  ))}</div>
            })()}
          </div>

          {/* 지원사업별 기업 수 + 기업유형 */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="font-semibold text-gray-700 text-sm mb-3">기업유형별 비율</div>
              {(() => {
                const typeMap = {}
                selectedFirms.forEach(f => { const t = f.type || '미정'; typeMap[t] = (typeMap[t]||0)+1 })
                const maxV = Math.max(...Object.values(typeMap), 1)
                return Object.entries(typeMap).map(([t, cnt]) => (
                  <div key={t} className="flex items-center gap-3 mb-2">
                    <div className="text-xs text-gray-600 min-w-[60px]">{t}</div>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${Math.round(cnt/maxV*100)}%`, background: t.includes('테크')?'#2E75B6':t.includes('로컬')?'#1E5631':'#8B6914' }} />
                    </div>
                    <div className="text-xs font-bold text-gray-700 min-w-[40px] text-right">{cnt}개 ({selectedFirms.length>0?Math.round(cnt/selectedFirms.length*100):0}%)</div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>

        {/* 지원사업별 기업 수 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="font-semibold text-gray-700 text-sm mb-4">지원사업별 선정기업 수</div>
          {(() => {
            const progMap = {}
            selectedFirms.forEach(f => { const p = f.program||'미지정'; progMap[p] = (progMap[p]||0)+1 })
            const entries = Object.entries(progMap).sort((a,b)=>b[1]-a[1])
            const maxV = Math.max(...entries.map(([,v])=>v), 1)
            return entries.length === 0
              ? <div className="text-center text-gray-400 text-sm py-4">데이터 없음</div>
              : entries.map(([p, cnt]) => (
                <div key={p} className="flex items-center gap-3 mb-2">
                  <div className="text-xs text-gray-600 min-w-[140px] truncate" title={p}>{p}</div>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${Math.round(cnt/maxV*100)}%`, background:'#2E75B6' }} />
                  </div>
                  <div className="text-xs font-bold text-blue-700 min-w-[36px] text-right">{cnt}개사</div>
                </div>
              ))
          })()}
        </div>
      </div>

      {/* Program stats table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-700 text-sm">지원사업별 선정 현황</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">사업명</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">참여</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">선정</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">선정률</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">지원금합계(만원)</th>
              </tr>
            </thead>
            <tbody>
              {programStats.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-xs">데이터 없음</td></tr>
              ) : programStats.map(({ program, total, selected, totalAmt }) => (
                <tr key={program} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{program}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{total}건</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-semibold text-green-700">{selected}건</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    {total > 0 ? `${Math.round(selected / total * 100)}%` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                    {totalAmt > 0 ? totalAmt.toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
