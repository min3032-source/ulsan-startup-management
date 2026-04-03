import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { VerdictBadge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import {
  Users, MessageSquare, Building2, UserCheck,
  TrendingUp, DollarSign, FileText, Download
} from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

export default function Report() {
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [year])

  async function loadData() {
    setLoading(true)
    try {
      const [
        { data: founders },
        { data: consults },
        { data: selectedFirms },
        { data: supports },
        { data: mentorings },
        { data: growths },
      ] = await Promise.all([
        supabase.from('founders').select('*'),
        supabase.from('consults').select('*').order('date', { ascending: false }),
        supabase.from('selected_firms').select('*'),
        supabase.from('support_items').select('*'),
        supabase.from('mentorings').select('*'),
        supabase.from('growths').select('*').eq('year', year),
      ])

      const f  = founders     || []
      const c  = consults     || []
      const sf = selectedFirms || []
      const s  = supports     || []
      const m  = mentorings   || []
      const g  = growths      || []

      // 연도 필터
      const filterYear = (arr, field) =>
        arr.filter(x => x[field] && String(x[field]).startsWith(year))

      const fYear  = filterYear(f,  'date')
      const cYear  = filterYear(c,  'date')
      const sfYear = filterYear(sf, 'start_date')
      const sYear  = filterYear(s,  'start_date')
      const mYear  = filterYear(m,  'date')

      // 통계 집계
      const verdictDist = {}
      fYear.forEach(x => {
        const v = x.verdict || '미정'
        verdictDist[v] = (verdictDist[v] || 0) + 1
      })

      const regionDist = {}
      fYear.forEach(x => {
        const r = x.region || '미지정'
        regionDist[r] = (regionDist[r] || 0) + 1
      })

      const staffDist = {}
      cYear.forEach(x => {
        if (!x.staff) return
        staffDist[x.staff] = (staffDist[x.staff] || 0) + 1
      })

      const programDist = {}
      sfYear.forEach(x => {
        const p = x.program || '기타'
        programDist[p] = (programDist[p] || 0) + 1
      })

      // 성장 집계
      const totalRevenue    = g.reduce((sum, x) => sum + Number(x.revenue    || 0), 0)
      const totalEmployees  = g.reduce((sum, x) => sum + Number(x.employees  || 0), 0)
      const totalInvestment = g.reduce((sum, x) => sum + Number(x.investment || 0), 0)

      // 지원금 합계
      const totalAmount = sYear.reduce((sum, x) => sum + Number(x.amount || 0), 0)

      setData({
        founders:   fYear.length,
        consults:   cYear.length,
        followUp:   cYear.filter(x => x.status === '후속필요').length,
        selectedFirms: sfYear.length,
        mentorings: mYear.length,
        supports:   sYear.length,
        totalAmount,
        verdictDist:  Object.entries(verdictDist).sort((a,b) => b[1]-a[1]),
        regionDist:   Object.entries(regionDist).sort((a,b) => b[1]-a[1]),
        staffDist:    Object.entries(staffDist).sort((a,b) => b[1]-a[1]),
        programDist:  Object.entries(programDist).sort((a,b) => b[1]-a[1]),
        totalRevenue,
        totalEmployees,
        totalInvestment,
        growthCount: g.length,
      })
    } catch (e) {
      console.error('Report load error:', e)
    } finally {
      setLoading(false)
    }
  }

  function printReport() {
    window.print()
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - i))

  return (
    <div className="p-6 max-w-5xl">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">성과 보고</h1>
          <p className="text-sm text-gray-500 mt-0.5">연도별 창업지원 통합 성과 현황</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <button
            onClick={printReport}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            인쇄/저장
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 text-gray-400">데이터를 불러올 수 없습니다</div>
      ) : (
        <div className="space-y-6" id="report-content">

          {/* 제목 */}
          <div className="bg-gradient-to-r from-[#0D1B2A] to-[#1F4E79] text-white rounded-xl p-5">
            <div className="text-xs opacity-60 mb-1">울산경제일자리진흥원</div>
            <div className="text-lg font-bold">{year}년 창업지원 성과 보고서</div>
            <div className="text-xs opacity-60 mt-1">기준일: {new Date().toLocaleDateString('ko-KR')}</div>
          </div>

          {/* 핵심 지표 */}
          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
              <FileText size={14} /> 핵심 지표
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="신규 창업자" value={`${data.founders}명`} color="blue" icon={Users} />
              <StatCard label="상담 건수" value={`${data.consults}건`} sub={`후속 ${data.followUp}건`} color="teal" icon={MessageSquare} />
              <StatCard label="선정기업" value={`${data.selectedFirms}개사`} color="green" icon={Building2} />
              <StatCard label="전문가 상담" value={`${data.mentorings}건`} color="amber" icon={UserCheck} />
            </div>
          </div>

          {/* 지원 및 성장 */}
          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
              <TrendingUp size={14} /> 지원 및 성장 현황
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="지원사업 연계" value={`${data.supports}건`} color="blue" icon={Building2} />
              <StatCard label="지원금 합계" value={`${data.totalAmount.toLocaleString()}만원`} color="green" icon={DollarSign} />
              <StatCard label="총 매출 합계" value={`${data.totalRevenue.toLocaleString()}백만원`} sub={`${data.growthCount}개사`} color="teal" icon={TrendingUp} />
              <StatCard label="총 고용인원" value={`${data.totalEmployees}명`} sub={`투자유치 ${data.totalInvestment.toLocaleString()}백만원`} color="amber" icon={Users} />
            </div>
          </div>

          {/* 상세 분석 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* 창업 유형 분포 */}
            <SectionCard title="창업 유형 분포">
              {data.verdictDist.length === 0 ? (
                <EmptyData />
              ) : (
                <BarChart
                  rows={data.verdictDist}
                  colorFn={v =>
                    v.includes('테크') ? '#2E75B6' : v.includes('로컬') ? '#1E5631' : '#8B6914'
                  }
                />
              )}
            </SectionCard>

            {/* 지역별 접수 */}
            <SectionCard title="지역별 접수 현황">
              {data.regionDist.length === 0 ? (
                <EmptyData />
              ) : (
                <BarChart rows={data.regionDist} colorFn={() => '#2E75B6'} />
              )}
            </SectionCard>

            {/* 담당자별 상담 */}
            <SectionCard title="담당자별 상담 현황">
              {data.staffDist.length === 0 ? (
                <EmptyData />
              ) : (
                <BarChart rows={data.staffDist} colorFn={() => '#17627A'} />
              )}
            </SectionCard>

            {/* 프로그램별 선정 */}
            <SectionCard title="프로그램별 선정 현황">
              {data.programDist.length === 0 ? (
                <EmptyData />
              ) : (
                <BarChart rows={data.programDist} colorFn={() => '#1E5631'} />
              )}
            </SectionCard>
          </div>

        </div>
      )}
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="text-sm font-semibold text-gray-700 mb-4">{title}</div>
      {children}
    </div>
  )
}

function EmptyData() {
  return <div className="text-center text-gray-400 text-xs py-6">해당 연도 데이터 없음</div>
}

function BarChart({ rows, colorFn }) {
  const max = Math.max(...rows.map(([, v]) => v), 1)
  return (
    <div className="space-y-2.5">
      {rows.map(([label, count]) => (
        <div key={label} className="flex items-center gap-2">
          <div className="text-xs text-gray-600 min-w-[120px] truncate" title={label}>{label}</div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round(count / max * 100)}%`, background: colorFn(label) }}
            />
          </div>
          <div className="text-xs font-semibold text-gray-700 min-w-[28px] text-right">{count}</div>
        </div>
      ))}
    </div>
  )
}
