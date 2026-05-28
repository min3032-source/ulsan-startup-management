import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'


const STATUS_COLOR = {
  '모집중': 'bg-blue-100 text-blue-700',
  '진행중': 'bg-teal-100 text-teal-700',
  '완료':   'bg-green-100 text-green-700',
  '취소':   'bg-gray-100 text-gray-500',
}

const TABS = [
  { id: 'education', label: '교육별 현황' },
  { id: 'business',  label: '사업별 현황' },
  { id: 'survey',    label: '설문 통계' },
]

function barColor(avg) {
  if (!avg) return 'bg-gray-200'
  const v = parseFloat(avg)
  if (v >= 4.5) return 'bg-green-500'
  if (v >= 3.5) return 'bg-blue-500'
  if (v >= 2.5) return 'bg-amber-400'
  return 'bg-red-400'
}

export default function EducationDashboard() {
  const [tab, setTab] = useState('education')
  const [programs, setPrograms] = useState([])
  const [applications, setApplications] = useState([])
  const [relatedPrograms, setRelatedPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedBusiness, setExpandedBusiness] = useState({})

  // 설문 필터
  const [surveyFilterProgram, setSurveyFilterProgram] = useState('')
  const [surveyFilterBusiness, setSurveyFilterBusiness] = useState('')
  const [showOnlyNonRespondents, setShowOnlyNonRespondents] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [pRes, aRes, rpRes] = await Promise.all([
      supabase.from('education_programs').select('*').order('start_date', { ascending: true }),
      supabase.from('education_applications').select('*'),
      supabase.from('education_related_programs').select('*').order('year', { ascending: false }),
    ])
    if (!pRes.error) setPrograms(pRes.data || [])
    if (!aRes.error) setApplications(aRes.data || [])
    if (!rpRes.error) setRelatedPrograms(rpRes.data || [])
    setLoading(false)
  }

  // KPI
  const totalPrograms = programs.length
  const totalApplicants = applications.filter(a => a.status === '승인' || a.status === '수료').length
  const totalCompleted = applications.filter(a => a.status === '수료').length
  const allRatings = applications
    .filter(a => a.status === '수료' && a.survey_completed && a.survey_data?.answers?.length)
    .flatMap(a => a.survey_data.answers)
    .filter(v => typeof v === 'number' && v > 0)
  const avgSatisfaction = allRatings.length > 0
    ? (allRatings.reduce((s, v) => s + v, 0) / allRatings.length).toFixed(1)
    : null

  // 교육별 통계
  const programStats = programs.map(p => {
    const apps = applications.filter(a => a.program_id === p.id)
    const completed = apps.filter(a => a.status === '수료')
    const surveyed = apps.filter(a => a.status === '수료' && a.survey_completed && a.survey_data?.answers?.length)
    const ratings = surveyed.flatMap(a => a.survey_data.answers).filter(v => typeof v === 'number' && v > 0)
    const avg = ratings.length > 0
      ? (ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(1)
      : null
    return {
      ...p,
      applicants: apps.length,
      completedCount: completed.length,
      completionRate: apps.length > 0 ? Math.round((completed.length / apps.length) * 100) : 0,
      surveyCount: surveyed.length,
      avgSatisfaction: avg,
    }
  })

  // 사업별 그룹 (수강생 related_program 기준으로 교육 프로그램 분류)
  const registeredNames = new Set(relatedPrograms.map(rp => rp.name))
  const businessGroups = {}
  relatedPrograms.forEach(rp => { businessGroups[rp.name] = [] })
  programStats.forEach(p => {
    const progApps = applications.filter(a => a.program_id === p.id)
    const bizNames = [...new Set(progApps.map(a => a.related_program).filter(Boolean))]
    bizNames.forEach(bizName => {
      if (registeredNames.has(bizName)) {
        if (!businessGroups[bizName]) businessGroups[bizName] = []
        if (!businessGroups[bizName].find(x => x.id === p.id)) {
          businessGroups[bizName].push(p)
        }
      }
    })
  })

  // ── 설문 통계 계산 ──
  const surveyApps = applications.filter(a => {
    if (a.status !== '수료') return false
    if (!a.survey_completed || !a.survey_data?.answers?.length) return false
    if (surveyFilterProgram && a.program_id !== surveyFilterProgram) return false
    if (surveyFilterBusiness && a.related_program !== surveyFilterBusiness) return false
    return true
  })

  const inScopeApplicants = applications.filter(a => {
    if (a.status !== '수료') return false
    if (surveyFilterProgram && a.program_id !== surveyFilterProgram) return false
    if (surveyFilterBusiness && a.related_program !== surveyFilterBusiness) return false
    return true
  })
  const totalInScope = inScopeApplicants.length
  const respondedInScope = inScopeApplicants.filter(a => !!a.survey_completed).length
  const nonRespondedInScope = totalInScope - respondedInScope

  const respondentTableData = (showOnlyNonRespondents
    ? inScopeApplicants.filter(a => !a.survey_completed)
    : inScopeApplicants
  ).map(a => ({
    id: a.id,
    name: a.applicant_name || '-',
    phone: a.phone || '-',
    programTitle: programs.find(p => p.id === a.program_id)?.title || '-',
    business: a.related_program || '-',
    responded: !!a.survey_completed,
    respondedAt: a.survey_completed_at ? a.survey_completed_at.slice(0, 10) : null,
  }))

  const toTyped = q => typeof q === 'string'
    ? { text: q, type: 'rating' }
    : { text: q?.text ?? '', type: q?.type ?? 'rating' }

  const surveyQuestionsTyped = (() => {
    const prog = surveyFilterProgram
      ? programs.find(p => p.id === surveyFilterProgram)
      : programs.find(p => p.survey_questions?.length > 0)
    const rawQs = prog?.survey_questions
    if (!rawQs?.length) return []
    return rawQs.map(toTyped).filter(q => q.text.trim())
  })()

  const surveyQuestions = surveyQuestionsTyped.map(q => q.text)

  const questionStats = surveyQuestionsTyped.map((qt, idx) => {
    if (qt.type === 'text') return { q: qt.text, avg: null, total: 0, isText: true }
    const answers = surveyApps.map(a => a.survey_data.answers[idx]).filter(v => typeof v === 'number' && v > 0)
    const avg = answers.length > 0 ? (answers.reduce((s, v) => s + v, 0) / answers.length).toFixed(1) : null
    return { q: qt.text, avg, total: answers.length, isText: false }
  })

  // 주관식 응답: 각 앱의 해당 교육 문항 타입 기준으로 수집
  const textResponses = surveyApps.flatMap(app => {
    const prog = programs.find(p => p.id === app.program_id)
    const rawQs = prog?.survey_questions
    const typedQs = rawQs?.length
      ? rawQs.map(toTyped).filter(q => q.text.trim())
      : []
    return typedQs
      .map((qt, idx) => ({
        type: qt.type,
        questionText: qt.text,
        answer: app.survey_data?.answers?.[idx],
        programTitle: prog?.title || '-',
        business: app.related_program || '-',
      }))
      .filter(r => r.type === 'text' && typeof r.answer === 'string' && r.answer.trim())
  })

  const allSurveyAnswers = surveyApps.flatMap(a => a.survey_data.answers.filter(v => typeof v === 'number' && v > 0))
  const avgSurvey = allSurveyAnswers.length > 0
    ? (allSurveyAnswers.reduce((s, v) => s + v, 0) / allSurveyAnswers.length).toFixed(1)
    : null

  const scoreDist = [1, 2, 3, 4, 5].map(star => {
    const count = allSurveyAnswers.filter(v => v === star).length
    return { star, count, pct: allSurveyAnswers.length > 0 ? Math.round((count / allSurveyAnswers.length) * 100) : 0 }
  })

  // 사업별 비교 (사업 필터 = 전체일 때)
  const businessComparisonRows = relatedPrograms.map(rp => {
    const rpApps = applications.filter(a => {
      if (a.status !== '수료') return false
      if (!a.survey_completed || !a.survey_data?.answers?.length) return false
      if (surveyFilterProgram && a.program_id !== surveyFilterProgram) return false
      return a.related_program === rp.name
    })
    const rpAnswers = rpApps.flatMap(a => a.survey_data.answers.filter(v => v > 0))
    const rpAvg = rpAnswers.length > 0
      ? (rpAnswers.reduce((s, v) => s + v, 0) / rpAnswers.length).toFixed(1)
      : null
    const qAvgs = surveyQuestions.map((_, idx) => {
      const ans = rpApps.map(a => a.survey_data.answers[idx]).filter(v => v != null && v > 0)
      return ans.length > 0 ? (ans.reduce((s, v) => s + v, 0) / ans.length).toFixed(1) : null
    })
    return { name: rp.name, count: rpApps.length, avg: rpAvg, qAvgs }
  })

  const etcApps = applications.filter(a => {
    if (a.status !== '수료') return false
    if (!a.survey_completed || !a.survey_data?.answers?.length) return false
    if (surveyFilterProgram && a.program_id !== surveyFilterProgram) return false
    return !a.related_program || !registeredNames.has(a.related_program)
  })
  const etcAnswers = etcApps.flatMap(a => a.survey_data.answers.filter(v => v > 0))
  const etcAvg = etcAnswers.length > 0
    ? (etcAnswers.reduce((s, v) => s + v, 0) / etcAnswers.length).toFixed(1)
    : null
  const etcQAvgs = surveyQuestions.map((_, idx) => {
    const ans = etcApps.map(a => a.survey_data.answers[idx]).filter(v => v != null && v > 0)
    return ans.length > 0 ? (ans.reduce((s, v) => s + v, 0) / ans.length).toFixed(1) : null
  })

  const showBizTable = !surveyFilterBusiness
  const hasBizTableData = businessComparisonRows.some(r => r.count > 0) || etcApps.length > 0


  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 bg-slate-50 min-h-screen">
      <PageHeader title="교육 대시보드" />

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 교육 수" value={`${totalPrograms}개`} color="blue" />
        <StatCard label="전체 신청자" value={`${totalApplicants}명`} color="teal" />
        <StatCard label="전체 수료자" value={`${totalCompleted}명`} color="green" />
        <StatCard label="평균 만족도" value={avgSatisfaction ? `⭐ ${avgSatisfaction}점` : '-'} color="orange" />
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 교육별 현황 */}
      {tab === 'education' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['교육명', '사업명', '기간', '신청자', '수료자', '수료율', '설문완료', '평균만족도', '상태'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {programStats.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">등록된 프로그램이 없습니다</td></tr>
              ) : programStats.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{p.title}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {p.related_program
                      ? <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{p.related_program}</span>
                      : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {p.start_date ? `${p.start_date} ~ ${p.end_date || ''}` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 text-center">{p.applicants}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 text-center">{p.completedCount}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-14 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${p.completionRate}%` }} />
                      </div>
                      <span>{p.completionRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 text-center">{p.surveyCount}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 text-center">
                    {p.avgSatisfaction ? `⭐ ${p.avgSatisfaction}` : '-'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-500'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 사업별 현황 */}
      {tab === 'business' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(businessGroups).filter(([name]) => name !== '기타(사업 미지정)').map(([name, progs]) => {
            const bizApps = name === '기타(사업 미지정)'
              ? applications.filter(a => !a.related_program || !registeredNames.has(a.related_program))
              : applications.filter(a => a.related_program === name)
            const totalApps = bizApps.filter(a => a.status === '승인' || a.status === '수료').length
            const totalComp = bizApps.filter(a => a.status === '수료').length
            const allR = progs.flatMap(p =>
              applications
                .filter(a => a.program_id === p.id && a.survey_completed && a.survey_data?.answers?.length)
                .flatMap(a => a.survey_data.answers)
            .filter(v => typeof v === 'number' && v > 0)
            )
            const avg = allR.length > 0 ? (allR.reduce((s, v) => s + v, 0) / allR.length).toFixed(1) : null
            const isExpanded = expandedBusiness[name]
            return (
              <div key={name} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">교육 {progs.length}개</p>
                  </div>
                  {avg && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">⭐ {avg}점</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-extrabold text-blue-700">{totalApps}</div>
                    <div className="text-xs text-blue-500">총 신청자</div>
                  </div>
                  <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-extrabold text-green-700">{totalComp}</div>
                    <div className="text-xs text-green-500">총 수료자</div>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedBusiness(prev => ({ ...prev, [name]: !prev[name] }))}
                  className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 border-t border-gray-100 pt-2 transition"
                >
                  <span>교육 목록 ({progs.length}개)</span>
                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {isExpanded && (
                  <div className="space-y-1.5">
                    {progs.map(p => {
                      const progBizApps = name === '기타(사업 미지정)'
                        ? applications.filter(a => a.program_id === p.id && (!a.related_program || !registeredNames.has(a.related_program)))
                        : applications.filter(a => a.program_id === p.id && a.related_program === name)
                      const progApplicants = progBizApps.filter(a => a.status === '승인' || a.status === '수료').length
                      const progCompleted = progBizApps.filter(a => a.status === '수료').length
                      return (
                        <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-gray-50 rounded-lg">
                          <span className="text-gray-700 font-medium truncate flex-1 mr-2">{p.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-gray-400">신청 {progApplicants}명 / 수료 {progCompleted}명</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 설문 통계 */}
      {tab === 'survey' && (
        <div className="space-y-4">

          {/* 필터 영역 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">교육 선택</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={surveyFilterProgram}
                  onChange={e => setSurveyFilterProgram(e.target.value)}
                >
                  <option value="">전체 교육</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">사업명 선택</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={surveyFilterBusiness}
                  onChange={e => setSurveyFilterBusiness(e.target.value)}
                >
                  <option value="">전체 사업</option>
                  {relatedPrograms.map(rp => (
                    <option key={rp.id} value={rp.name}>{rp.name} ({rp.year}년)</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="응답자 수" value={`${respondedInScope}명`} color="blue" />
            <StatCard
              label="응답률"
              value={totalInScope > 0
                ? `${Math.round((respondedInScope / totalInScope) * 100)}% (${respondedInScope}/${totalInScope}명)`
                : '-'}
              color="teal"
            />
            <StatCard label="평균 만족도" value={avgSurvey ? `⭐ ${avgSurvey}점` : '-'} color="orange" />
          </div>

          {surveyApps.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
              선택한 조건의 설문 응답 데이터가 없습니다.
            </div>
          ) : (
            <>
              {/* 문항별 평균 점수 (점수형만) */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-700">문항별 평균 점수</h3>
                {questionStats.filter(qs => !qs.isText).map((qs, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-600 flex-1">
                        <span className="text-gray-400 mr-1">Q{idx + 1}.</span>{qs.q}
                      </p>
                      <span className="text-xs font-bold text-amber-600 whitespace-nowrap shrink-0">
                        {qs.avg ? `⭐ ${qs.avg}점` : '-'}
                        <span className="text-gray-400 font-normal ml-1">({qs.total}명)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor(qs.avg)}`}
                        style={{ width: qs.avg ? `${(parseFloat(qs.avg) / 5) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 점수 분포 */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                <h3 className="text-sm font-bold text-gray-700">점수 분포</h3>
                <div className="space-y-2">
                  {scoreDist.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-6 shrink-0">{star}점</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-16 shrink-0 text-right">{count}명 ({pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 사업별 비교 테이블 (사업 필터 = 전체일 때만) */}
              {showBizTable && hasBizTableData && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700">사업별 비교</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">사업명</th>
                        <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">응답자수</th>
                        <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">평균만족도</th>
                        {surveyQuestions.map((_, idx) => (
                          <th key={idx} className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Q{idx + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {businessComparisonRows.map(row => (
                        <tr key={row.name} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{row.name}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600 text-center">{row.count}명</td>
                          <td className="px-4 py-2.5 text-xs text-center font-semibold text-amber-600">
                            {row.avg ? `⭐ ${row.avg}` : '-'}
                          </td>
                          {row.qAvgs.map((q, idx) => (
                            <td key={idx} className="px-3 py-2.5 text-xs text-gray-600 text-center">
                              {q || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {etcApps.length > 0 && (
                        <tr className="border-b border-gray-50 bg-gray-50">
                          <td className="px-4 py-2.5 text-xs text-gray-400 italic">기타(미지정)</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500 text-center">{etcApps.length}명</td>
                          <td className="px-4 py-2.5 text-xs text-center font-semibold text-amber-500">
                            {etcAvg ? `⭐ ${etcAvg}` : '-'}
                          </td>
                          {etcQAvgs.map((q, idx) => (
                            <td key={idx} className="px-3 py-2.5 text-xs text-gray-500 text-center">
                              {q || '-'}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 응답자 현황 */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700">응답자 현황</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      전체 {totalInScope}명 중 {respondedInScope}명 응답 · 미응답 {nonRespondedInScope}명
                    </p>
                  </div>
                  <button
                    onClick={() => setShowOnlyNonRespondents(v => !v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                      showOnlyNonRespondents
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-500'
                    }`}
                  >
                    {showOnlyNonRespondents ? '✕ 미응답자만 보는 중' : '미응답자만 보기'}
                  </button>
                </div>
                {respondentTableData.length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-400">
                    {showOnlyNonRespondents ? '미응답자가 없습니다.' : '신청자 데이터가 없습니다.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">신청자</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">연락처</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">교육명</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">사업명</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">응답 여부</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">응답일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {respondentTableData.map(r => (
                          <tr key={r.id} className={`hover:bg-gray-50 transition ${!r.responded ? 'bg-red-50/30' : ''}`}>
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{r.name}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{r.phone}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[160px] truncate">{r.programTitle}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">
                              {r.business !== '-'
                                ? <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{r.business}</span>
                                : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {r.responded
                                ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">✅ 응답</span>
                                : <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">❌ 미응답</span>}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-400 text-center">
                              {r.respondedAt || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 주관식 응답 */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                <h3 className="text-sm font-bold text-gray-700">주관식 응답 (총 {textResponses.length}건)</h3>
                {textResponses.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">아직 응답이 없습니다.</p>
                ) : (
                  <div className="space-y-2.5">
                    {textResponses.map((r, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.business !== '-' && (
                            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{r.business}</span>
                          )}
                          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{r.programTitle}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">"{r.answer}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
