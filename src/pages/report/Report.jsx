import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import {
  Users, MessageSquare, Building2, UserCheck,
  TrendingUp, DollarSign, FileText, Download, Printer,
  ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

export default function Report() {
  const [activeView, setActiveView] = useState('summary')
  const [year, setYear]             = useState(String(CURRENT_YEAR))
  const [program, setProgram]       = useState('')
  const [programList, setProgramList] = useState([])
  const [data, setData]             = useState(null)
  const [yearData, setYearData]     = useState(null) // 연도 필터만 적용된 raw 데이터 (사업별 탭용)
  const [loading, setLoading]       = useState(true)
  const [expandedProgram, setExpandedProgram] = useState(null)

  useEffect(() => {
    supabase.from('team_settings').select('programs').single().then(({ data: s }) => {
      if (s?.programs) setProgramList(s.programs)
    })
  }, [])

  useEffect(() => { loadData() }, [year, program])

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
        year === '전체'
          ? supabase.from('growths').select('*')
          : supabase.from('growths').select('*').eq('year', year),
      ])

      const f  = founders      || []
      const c  = consults      || []
      const sf = selectedFirms || []
      const s  = supports      || []
      const m  = mentorings    || []
      const g  = growths       || []

      const filterYear = (arr, field) =>
        year === '전체' ? arr : arr.filter(x => x[field] && String(x[field]).startsWith(year))

      let fYear  = filterYear(f,  'date')
      let cYear  = filterYear(c,  'date')
      let sfYear = filterYear(sf, 'start_date')
      let sYear  = filterYear(s,  'start_date')
      let mYear  = filterYear(m,  'date')

      // 사업별 탭용으로 프로그램 필터 전 데이터 저장
      setYearData({ fYear, cYear, sYear, sfYear })

      // 사업별 필터
      if (program) {
        cYear  = cYear.filter(x  => Array.isArray(x.programs) && x.programs.includes(program))
        sfYear = sfYear.filter(x => x.program === program)
        sYear  = sYear.filter(x  => x.program === program)
        mYear  = mYear.filter(x  => x.program === program)
        const linkedIds = new Set(
          [...cYear.map(x => x.founder_id), ...sYear.map(x => x.founder_id)].filter(Boolean)
        )
        fYear = fYear.filter(x => linkedIds.has(x.id))
      }

      // 통계 집계
      const verdictDist = {}
      fYear.forEach(x => { const v = x.verdict || '미정'; verdictDist[v] = (verdictDist[v] || 0) + 1 })

      const regionDist = {}
      fYear.forEach(x => { const r = x.region || '미지정'; regionDist[r] = (regionDist[r] || 0) + 1 })

      const genderDist = {}
      fYear.forEach(x => { const gd = x.gender || '미입력'; genderDist[gd] = (genderDist[gd] || 0) + 1 })

      const staffDist = {}
      cYear.forEach(x => { if (!x.staff) return; staffDist[x.staff] = (staffDist[x.staff] || 0) + 1 })

      const programDist = {}
      sfYear.forEach(x => { const p = x.program || '기타'; programDist[p] = (programDist[p] || 0) + 1 })

      const totalRevenue    = g.reduce((sum, x) => sum + Number(x.revenue    || 0), 0)
      const totalEmployees  = g.reduce((sum, x) => sum + Number(x.employees  || 0), 0)
      const totalInvestment = g.reduce((sum, x) => sum + Number(x.investment || 0), 0)
      const totalAmount     = sYear.reduce((sum, x) => sum + Number(x.amount || 0), 0)
      const founderCount    = fYear.filter(x => x.is_founder === true).length

      // 선정기업 집계
      const sfAmount = sfYear.reduce((sum, x) => sum + Number(x.amount || 0), 0)
      const sfDone   = sfYear.filter(x => x.status === '완료').length
      const sfByProgram = {}
      sfYear.forEach(x => { const p = x.program || '기타'; if (!sfByProgram[p]) sfByProgram[p] = []; sfByProgram[p].push(x) })

      setData({
        founders: fYear.length, founderCount,
        consults: cYear.length, followUp: cYear.filter(x => x.status === '후속필요').length,
        selectedFirms: sfYear.length, mentorings: mYear.length,
        supports: sYear.length, totalAmount,
        verdictDist:  Object.entries(verdictDist).sort((a, b) => b[1] - a[1]),
        regionDist:   Object.entries(regionDist).sort((a, b) => b[1] - a[1]),
        genderDist:   Object.entries(genderDist).sort((a, b) => b[1] - a[1]),
        staffDist:    Object.entries(staffDist).sort((a, b) => b[1] - a[1]),
        programDist:  Object.entries(programDist).sort((a, b) => b[1] - a[1]),
        totalRevenue, totalEmployees, totalInvestment, growthCount: g.length,
        fYear,
        sfYear, sfAmount, sfDone, sfByProgram,
      })
    } catch (e) {
      console.error('Report load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const yearLabel   = year === '전체' ? '전체' : `${year}년`
  const reportTitle = program ? `${yearLabel} ${program} 성과 보고서` : `${yearLabel} 창업지원 성과 보고서`
  const yearOptions = ['전체', ...Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - i))]

  function printFull() { window.print() }

  function printOnePage() {
    document.body.classList.add('print-one-page')
    setTimeout(() => {
      window.print()
      document.body.classList.remove('print-one-page')
    }, 60)
  }

  return (
    <div className="p-6 max-w-5xl">

      {/* ── 한 장 출력 전용 요약 (화면에서는 숨김) ── */}
      {data && (
        <div id="print-summary">
          <OnePageSummary data={data} reportTitle={reportTitle} />
        </div>
      )}

      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between mb-5 no-print">
        <div>
          <h1 className="text-xl font-bold text-gray-800">성과 보고</h1>
          <p className="text-sm text-gray-500 mt-0.5">연도별 창업지원 통합 성과 현황</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select value={year} onChange={e => setYear(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400">
            {yearOptions.map(y => (
              <option key={y} value={y}>{y === '전체' ? '전체 연도' : `${y}년`}</option>
            ))}
          </select>
          <select value={program} onChange={e => setProgram(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400">
            <option value="">전체 사업</option>
            {programList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={printFull}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
            <Download size={14} /> 인쇄/저장
          </button>
          <button onClick={printOnePage}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">
            <Printer size={14} /> 한 장 출력
          </button>
        </div>
      </div>

      {/* ── 뷰 탭 ── */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-5 no-print">
        {[['summary', '통합 보기'], ['byProgram', '사업별']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveView(key)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              activeView === key ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 text-gray-400">데이터를 불러올 수 없습니다</div>
      ) : activeView === 'summary' ? (

        /* ── 통합 보기 ── */
        <div className="space-y-6" id="report-content">
          <div className="bg-gradient-to-r from-[#0D1B2A] to-[#1F4E79] text-white rounded-xl p-5">
            <img src="/logo.gif" alt="울산경제일자리진흥원 로고" style={{ height: 32 }} className="w-auto mb-2" />
            <div className="text-xs opacity-60 mb-1">울산경제일자리진흥원</div>
            <div className="text-lg font-bold">{reportTitle}</div>
            <div className="text-xs opacity-60 mt-1">기준일: {new Date().toLocaleDateString('ko-KR')}</div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
              <FileText size={14} /> 핵심 지표
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="신규 상담" value={`${data.founders}명`} sub={`창업자 ${data.founderCount}명`} color="blue" icon={Users} />
              <StatCard label="상담 건수" value={`${data.consults}건`} sub={`후속 ${data.followUp}건`} color="teal" icon={MessageSquare} />
              <StatCard label="선정기업" value={`${data.selectedFirms}개사`} color="green" icon={Building2} />
              <StatCard label="전문가 상담" value={`${data.mentorings}건`} color="amber" icon={UserCheck} />
            </div>
          </div>

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

          {/* 선정기업 현황 */}
          {data.sfYear && data.sfYear.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                <Building2 size={14} /> 선정기업 현황
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <StatCard label="선정기업 합계" value={`${data.selectedFirms}개사`} color="blue" />
                <StatCard label="지원중" value={`${data.sfYear.filter(f=>f.status==='지원중').length}개사`} color="orange" />
                <StatCard label="지원 완료" value={`${data.sfDone}개사`} color="green" />
                <StatCard label="선정기업 지원금" value={`${data.sfAmount >= 10000 ? (data.sfAmount/10000).toFixed(1)+'억' : data.sfAmount.toLocaleString()+'만'}`} color="teal" />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600">지원사업별 선정기업 목록</div>
                {Object.entries(data.sfByProgram).map(([prog, list]) => (
                  <div key={prog} className="border-b border-gray-100 last:border-0">
                    <div className="px-4 py-2 bg-blue-50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-800">{prog}</span>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{list.length}개사</span>
                        <span className="font-bold text-green-700">{list.reduce((a,f)=>a+Number(f.amount||0),0).toLocaleString()}만원</span>
                        <span className="text-green-600">완료 {list.filter(f=>f.status==='완료').length}개</span>
                      </div>
                    </div>
                    <div className="px-4 py-1">
                      {list.map(f => (
                        <div key={f.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0 text-xs">
                          <span className="font-medium text-gray-800 min-w-[100px]">{f.company_name}</span>
                          <span className="text-gray-500">{f.ceo}</span>
                          {f.item && <span className="text-gray-400 flex-1 truncate">{f.item}</span>}
                          <span className={`px-1.5 py-0.5 rounded font-medium ${f.status === '완료' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{f.status}</span>
                          {f.amount && <span className="font-semibold text-green-700">{Number(f.amount).toLocaleString()}만</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SectionCard title="창업 유형 분포">
              {data.verdictDist.length === 0 ? <EmptyData /> : (
                <BarChart rows={data.verdictDist}
                  colorFn={v => v.includes('테크') ? '#2E75B6' : v.includes('로컬') ? '#1E5631' : '#8B6914'} />
              )}
            </SectionCard>
            <SectionCard title="지역별 접수 현황">
              {data.regionDist.length === 0 ? <EmptyData /> : (
                <BarChart rows={data.regionDist} colorFn={() => '#2E75B6'} />
              )}
            </SectionCard>
            <SectionCard title="담당자별 상담 현황">
              {data.staffDist.length === 0 ? <EmptyData /> : (
                <BarChart rows={data.staffDist} colorFn={() => '#17627A'} />
              )}
            </SectionCard>
            <SectionCard title="프로그램별 선정 현황">
              {data.programDist.length === 0 ? <EmptyData /> : (
                <BarChart rows={data.programDist} colorFn={() => '#1E5631'} />
              )}
            </SectionCard>
          </div>
        </div>

      ) : (

        /* ── 사업별 보기 ── */
        <ByProgramView
          programList={programList}
          yearData={yearData}
          yearLabel={yearLabel}
          expandedProgram={expandedProgram}
          setExpandedProgram={setExpandedProgram}
        />
      )}
    </div>
  )
}

/* ── 한 장 출력 요약 컴포넌트 ── */
function OnePageSummary({ data, reportTitle }) {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  const maleCount   = data.genderDist?.find(([k]) => k === '남')?.[1] ?? 0
  const femaleCount = data.genderDist?.find(([k]) => k === '여')?.[1] ?? 0
  const total = data.founders || 1

  return (
    <div style={{ fontFamily: "'Malgun Gothic', 'Noto Sans KR', sans-serif", color: '#1a1a1a', padding: '0' }}>
      {/* 제목 */}
      <div style={{ borderBottom: '3px solid #0D1B2A', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>울산경제일자리진흥원</div>
        <div style={{ fontSize: 20, fontWeight: 'bold', color: '#0D1B2A' }}>{reportTitle}</div>
        <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>출력일: {today}</div>
      </div>

      {/* 핵심 수치 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#0D1B2A', color: 'white' }}>
            {['총 상담 접수', '창업자 등록', '상담 건수', '선정기업', '지원금 합계', '전문가 상담'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, fontSize: 10 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ textAlign: 'center', background: '#f8f9fa' }}>
            <td style={{ padding: '8px 10px', fontWeight: 'bold', fontSize: 16, color: '#2E75B6' }}>{data.founders}명</td>
            <td style={{ padding: '8px 10px', fontWeight: 'bold', fontSize: 16, color: '#1E5631' }}>{data.founderCount}명</td>
            <td style={{ padding: '8px 10px', fontWeight: 'bold', fontSize: 16 }}>{data.consults}건</td>
            <td style={{ padding: '8px 10px', fontWeight: 'bold', fontSize: 16 }}>{data.selectedFirms}개사</td>
            <td style={{ padding: '8px 10px', fontWeight: 'bold', fontSize: 16, color: '#1E5631' }}>{data.totalAmount.toLocaleString()}만원</td>
            <td style={{ padding: '8px 10px', fontWeight: 'bold', fontSize: 16 }}>{data.mentorings}건</td>
          </tr>
        </tbody>
      </table>

      {/* 성별 / 창업유형 / 지역 3열 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* 성별 */}
        <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#444', marginBottom: 8, borderBottom: '1px solid #eee', paddingBottom: 6 }}>성별 현황</div>
          {[['남', maleCount], ['여', femaleCount]].map(([label, count]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span>{label}성</span>
              <span style={{ fontWeight: 'bold' }}>{count}명 ({total > 0 ? Math.round(count / total * 100) : 0}%)</span>
            </div>
          ))}
        </div>

        {/* 창업 유형 */}
        <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#444', marginBottom: 8, borderBottom: '1px solid #eee', paddingBottom: 6 }}>창업 유형 분포</div>
          {data.verdictDist.slice(0, 4).map(([label, count]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
              <span style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ fontWeight: 'bold', flexShrink: 0, marginLeft: 4 }}>{count}명</span>
            </div>
          ))}
        </div>

        {/* 지역별 */}
        <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#444', marginBottom: 8, borderBottom: '1px solid #eee', paddingBottom: 6 }}>지역별 현황</div>
          {data.regionDist.slice(0, 5).map(([label, count]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
              <span style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ fontWeight: 'bold', flexShrink: 0, marginLeft: 4 }}>{count}명</span>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 기관명 */}
      <div style={{ borderTop: '1px solid #ccc', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888' }}>
        <span>울산경제일자리진흥원 창업지원팀</span>
        <span>{today} 출력</span>
      </div>
    </div>
  )
}

/* ── 사업별 보기 ── */
function ByProgramView({ programList, yearData, yearLabel, expandedProgram, setExpandedProgram }) {
  if (!yearData) return <div className="text-center py-16 text-gray-400">로딩 중...</div>
  if (!programList || programList.length === 0)
    return <div className="text-center py-16 text-gray-400">환경설정에서 지원사업을 먼저 등록해주세요</div>

  const { fYear, cYear, sYear } = yearData

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">{yearLabel} · 각 사업에 연계된 창업자 현황</p>
      {programList.map(prog => {
        // 해당 사업에 연결된 창업자 ID 수집
        const linkedIds = new Set([
          ...sYear.filter(s => s.program === prog).map(s => s.founder_id),
          ...cYear.filter(c => Array.isArray(c.programs) && c.programs.includes(prog)).map(c => c.founder_id),
          ...fYear.filter(f => Array.isArray(f.programs) && f.programs.includes(prog)).map(f => f.id),
        ].filter(Boolean))

        const progFounders = fYear.filter(f => linkedIds.has(f.id))
        const founderCount = progFounders.filter(f => f.is_founder === true).length
        const techCount    = progFounders.filter(f => f.verdict === '테크 창업').length
        const localCount   = progFounders.filter(f => f.verdict === '로컬 창업').length
        const isOpen = expandedProgram === prog

        return (
          <div key={prog} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedProgram(isOpen ? null : prog)}
            >
              <div className="flex items-center gap-3 flex-wrap">
                {isOpen ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" /> : <ChevronRightIcon size={15} className="text-gray-400 flex-shrink-0" />}
                <span className="font-semibold text-gray-800 text-sm">{prog}</span>
                <span className="text-xs text-gray-400">참여 {progFounders.length}명</span>
                <span className="text-xs font-medium text-green-700">창업자 {founderCount}명</span>
                <span className="inline-flex gap-2 text-xs">
                  <span className="text-blue-600">테크 {techCount}</span>
                  <span className="text-green-700">로컬 {localCount}</span>
                  {progFounders.length - techCount - localCount > 0 &&
                    <span className="text-amber-600">기타 {progFounders.length - techCount - localCount}</span>
                  }
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                {progFounders.length > 0 && (
                  <div className="flex -space-x-1">
                    {progFounders.slice(0, 4).map(f => (
                      <div key={f.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-white"
                        style={{ background: '#2E75B6' }}>
                        {f.name?.charAt(0)}
                      </div>
                    ))}
                    {progFounders.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 border border-white">
                        +{progFounders.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100">
                {progFounders.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">연계된 창업자가 없습니다</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {['이름', '연락처', '지역', '창업유형', '창업단계', '담당자', '창업자여부'].map(h => (
                            <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {progFounders.map(f => (
                          <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                  {f.name?.charAt(0)}
                                </div>
                                <span className="text-xs font-medium text-gray-800">{f.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{f.phone}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">
                              {f.region === '기타(타지역)' ? `타지역${f.region_detail ? ` (${f.region_detail})` : ''}` : f.region || '-'}
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              {f.verdict ? (
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  f.verdict.includes('테크') ? 'bg-blue-100 text-blue-700'
                                  : f.verdict.includes('로컬') ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                                }`}>{f.verdict}</span>
                              ) : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{f.stage || '-'}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{f.assignee || '-'}</td>
                            <td className="px-4 py-2.5 text-xs">
                              {f.is_founder
                                ? <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">창업자 ✓</span>
                                : <span className="text-gray-300">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
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
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.round(count / max * 100)}%`, background: colorFn(label) }} />
          </div>
          <div className="text-xs font-semibold text-gray-700 min-w-[28px] text-right">{count}</div>
        </div>
      ))}
    </div>
  )
}
