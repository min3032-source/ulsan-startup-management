import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'

const DEFAULT_SURVEY_QUESTIONS = [
  '교육 내용은 창업에 도움이 되었나요?',
  '강사의 강의 전달력은 어땠나요?',
  '교육 환경(장소, 시설)은 만족스러웠나요?',
  '교육 일정과 시간은 적절했나요?',
  '이 교육을 다른 분께 추천하시겠어요?',
]

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

export default function EducationDashboard() {
  const [tab, setTab] = useState('education')
  const [programs, setPrograms] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [expandedBusiness, setExpandedBusiness] = useState({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [pRes, aRes] = await Promise.all([
      supabase.from('education_programs').select('*').order('start_date', { ascending: true }),
      supabase.from('education_applications').select('*'),
    ])
    if (!pRes.error) setPrograms(pRes.data || [])
    if (!aRes.error) setApplications(aRes.data || [])
    setLoading(false)
  }

  // KPI
  const totalPrograms = programs.length
  const totalApplicants = applications.length
  const totalCompleted = applications.filter(a => a.status === '수료').length
  const allRatings = applications
    .filter(a => a.survey_completed && a.survey_data?.answers?.length)
    .flatMap(a => a.survey_data.answers)
  const avgSatisfaction = allRatings.length > 0
    ? (allRatings.reduce((s, v) => s + v, 0) / allRatings.length).toFixed(1)
    : null

  // 교육별 통계
  const programStats = programs.map(p => {
    const apps = applications.filter(a => a.program_id === p.id)
    const completed = apps.filter(a => a.status === '수료')
    const surveyed = apps.filter(a => a.survey_completed && a.survey_data?.answers?.length)
    const ratings = surveyed.flatMap(a => a.survey_data.answers)
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

  // 사업별 그룹
  const businessGroups = {}
  programStats.forEach(p => {
    const key = p.related_program || '일반(사업 미지정)'
    if (!businessGroups[key]) businessGroups[key] = []
    businessGroups[key].push(p)
  })

  // 설문 통계 (선택된 교육)
  const selectedProg = programs.find(p => p.id === selectedProgramId)
  const selectedApps = applications.filter(a => a.program_id === selectedProgramId)
  const surveyedApps = selectedApps.filter(a => a.survey_completed && a.survey_data?.answers?.length)
  const surveyQuestions = selectedProg?.survey_questions?.length
    ? selectedProg.survey_questions
    : DEFAULT_SURVEY_QUESTIONS

  const questionStats = surveyQuestions.map((q, idx) => {
    const answers = surveyedApps.map(a => a.survey_data.answers[idx]).filter(v => v != null && v > 0)
    const avg = answers.length > 0 ? (answers.reduce((s, v) => s + v, 0) / answers.length).toFixed(1) : null
    const dist = [1, 2, 3, 4, 5].map(star => answers.filter(v => v === star).length)
    return { q, avg, dist, total: answers.length }
  })

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
          {Object.entries(businessGroups).map(([name, progs]) => {
            const totalApps = progs.reduce((s, p) => s + p.applicants, 0)
            const totalComp = progs.reduce((s, p) => s + p.completedCount, 0)
            const allR = progs.flatMap(p =>
              applications
                .filter(a => a.program_id === p.id && a.survey_completed && a.survey_data?.answers?.length)
                .flatMap(a => a.survey_data.answers)
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
                    {progs.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-gray-50 rounded-lg">
                        <span className="text-gray-700 font-medium truncate flex-1 mr-2">{p.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                      </div>
                    ))}
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">교육 선택</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={selectedProgramId}
              onChange={e => setSelectedProgramId(e.target.value)}
            >
              <option value="">교육을 선택하세요</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {!selectedProgramId ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">교육을 선택하면 설문 통계를 확인할 수 있습니다.</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="응답자 수" value={`${surveyedApps.length}명`} color="blue" />
                <StatCard label="전체 신청자" value={`${selectedApps.length}명`} color="teal" />
                <StatCard
                  label="응답률"
                  value={selectedApps.length > 0
                    ? `${Math.round((surveyedApps.length / selectedApps.length) * 100)}%`
                    : '-'}
                  color="green"
                />
              </div>

              {surveyedApps.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">설문 응답 데이터가 없습니다.</div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
                    <h3 className="text-sm font-bold text-gray-700">문항별 평균 점수</h3>
                    {questionStats.map((qs, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-gray-600 flex-1">
                            <span className="text-gray-400 mr-1">Q{idx + 1}.</span>{qs.q}
                          </p>
                          <span className="text-xs font-bold text-amber-600 whitespace-nowrap">
                            {qs.avg ? `⭐ ${qs.avg}점` : '-'}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: qs.avg ? `${(parseFloat(qs.avg) / 5) * 100}%` : '0%' }}
                          />
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star, si) => (
                            <div key={star} className="flex-1 text-center bg-gray-50 rounded py-1">
                              <div className="text-[10px] text-yellow-400">{'★'.repeat(star)}</div>
                              <div className="text-xs font-semibold text-gray-600">{qs.dist[si]}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {surveyedApps.some(a => a.survey_data?.opinion?.trim()) && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                      <h3 className="text-sm font-bold text-gray-700">자유 의견</h3>
                      <div className="space-y-2">
                        {surveyedApps
                          .filter(a => a.survey_data?.opinion?.trim())
                          .map((a, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-600 leading-relaxed">
                              "{a.survey_data.opinion}"
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
