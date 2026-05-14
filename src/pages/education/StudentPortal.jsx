import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import { LogIn, BookOpen, Award, ChevronLeft, Loader2, X, Printer } from 'lucide-react'
import { CertificateView } from './Education'

const DEFAULT_SURVEY_QUESTIONS = [
  { text: '교육 내용은 창업에 도움이 되었나요?', type: 'rating' },
  { text: '강사의 강의 전달력은 어땠나요?', type: 'rating' },
  { text: '교육 환경(장소, 시설)은 만족스러웠나요?', type: 'rating' },
  { text: '교육 일정과 시간은 적절했나요?', type: 'rating' },
  { text: '이 교육을 다른 분께 추천하시겠어요?', type: 'rating' },
]

const formatDateTimeDisplay = (date, time) => {
  if (!date) return ''
  if (!time) return date
  const t = typeof time === 'string' ? time.slice(0, 5) : ''
  return t ? date + ' ' + t : date
}

export default function StudentPortal() {
  const [screen, setScreen] = useState('login') // login | main | survey | certificate
  const [studentName, setStudentName] = useState('')
  const [applications, setApplications] = useState([])
  const [certMap, setCertMap] = useState({}) // appId → cert
  const [selectedApp, setSelectedApp] = useState(null)

  // 로그인
  const [loginForm, setLoginForm] = useState({ name: '', phone: '' })
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // 설문
  const [surveyQuestions, setSurveyQuestions] = useState(DEFAULT_SURVEY_QUESTIONS)
  const [ratings, setRatings] = useState([])
  const [opinion, setOpinion] = useState('')
  const [submittingSurvey, setSubmittingSurvey] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    if (!loginForm.name.trim() || !loginForm.phone.trim()) {
      setLoginError('이름과 연락처를 모두 입력해주세요.')
      return
    }
    setLoginLoading(true)
    const { data, error } = await supabase
      .from('education_applications')
      .select('*, education_programs(*)')
      .eq('applicant_name', loginForm.name.trim())
      .eq('phone', loginForm.phone.trim())
      .order('applied_at', { ascending: false })
    setLoginLoading(false)
    if (error || !data || data.length === 0) {
      setLoginError('신청 내역이 없습니다. 이름과 연락처를 확인해주세요.')
      return
    }
    // 수료증 일괄 조회
    const { data: certs } = await supabase
      .from('certificates')
      .select('*')
      .in('application_id', data.map(a => a.id))
    const map = {}
    ;(certs || []).forEach(c => { map[c.application_id] = c })
    setStudentName(loginForm.name.trim())
    setApplications(data)
    setCertMap(map)
    setScreen('main')
  }

  function openSurvey(app) {
    const rawQs = app.education_programs?.survey_questions?.length
      ? app.education_programs.survey_questions
      : DEFAULT_SURVEY_QUESTIONS
    const qs = rawQs.map(q => typeof q === 'string' ? { text: q, type: 'rating' } : q)
    setSelectedApp(app)
    setSurveyQuestions(qs)
    setRatings(qs.map(q => q.type === 'text' ? '' : 0))
    setOpinion('')
    setScreen('survey')
  }

  function openCertificate(app) {
    setSelectedApp(app)
    setScreen('certificate')
  }

  function logout() {
    setApplications([])
    setCertMap({})
    setSelectedApp(null)
    setLoginForm({ name: '', phone: '' })
    setScreen('login')
  }

  async function handleSurveySubmit() {
    if (surveyQuestions.some((q, idx) => q.type !== 'text' && ratings[idx] === 0)) {
      alert('모든 객관식 질문에 별점을 선택해주세요.')
      return
    }
    setSubmittingSurvey(true)
    const surveyData = { answers: ratings, opinion }
    const { error } = await supabase
      .from('education_applications')
      .update({
        survey_completed: true,
        survey_data: surveyData,
        survey_completed_at: new Date().toISOString(),
      })
      .eq('id', selectedApp.id)
    setSubmittingSurvey(false)
    if (error) { alert('제출 실패: ' + error.message); return }
    setApplications(prev =>
      prev.map(a => a.id === selectedApp.id
        ? { ...a, survey_completed: true, survey_data: surveyData }
        : a
      )
    )
    setScreen('main')
  }

  // ── 로그인 화면 ──────────────────────────────────────────
  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
          <div className="text-center mb-8">
            <img src="/logo.gif" alt="울산경제일자리진흥원" className="h-10 w-auto mx-auto mb-3" />
            <h1 className="text-2xl font-extrabold text-gray-800">수강생 포털</h1>
            <p className="text-sm text-gray-400 mt-1">수료증 발급 및 만족도 조사</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">이름</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={loginForm.name}
                onChange={e => setLoginForm(f => ({ ...f, name: e.target.value }))}
                placeholder="홍길동"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">연락처</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={loginForm.phone}
                onChange={e => setLoginForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                placeholder="010-1234-5678"
                maxLength={13}
              />
            </div>
            {loginError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              {loginLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loginLoading ? '조회 중...' : '내 교육 조회'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── 만족도 조사 화면 ─────────────────────────────────────
  if (screen === 'survey') {
    const prog = selectedApp?.education_programs
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto px-4 py-8">
          <button onClick={() => setScreen('main')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ChevronLeft size={16} /> 돌아가기
          </button>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-800">만족도 조사</h2>
              <p className="text-sm text-gray-400 mt-1">{prog?.title}</p>
            </div>
            {surveyQuestions.map((q, idx) => (
              <div key={idx} className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  <span className="text-gray-400 mr-1">Q{idx + 1}.</span>{q.text}
                </p>
                {q.type === 'text' ? (
                  <textarea
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-20"
                    value={typeof ratings[idx] === 'string' ? ratings[idx] : ''}
                    onChange={e => setRatings(r => r.map((v, i) => i === idx ? e.target.value : v))}
                    placeholder="의견을 자유롭게 입력해 주세요."
                  />
                ) : (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatings(r => r.map((v, i) => i === idx ? star : v))}
                        className={`text-2xl transition-transform hover:scale-110 ${star <= ratings[idx] ? 'text-yellow-400' : 'text-gray-200'}`}
                      >
                        ★
                      </button>
                    ))}
                    {ratings[idx] > 0 && (
                      <span className="self-center text-xs text-gray-400 ml-1">{ratings[idx]}점</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">자유 의견 (선택)</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none h-24"
                value={opinion}
                onChange={e => setOpinion(e.target.value)}
                placeholder="교육에 대한 자유로운 의견을 남겨주세요"
              />
            </div>
            <button
              onClick={handleSurveySubmit}
              disabled={submittingSurvey || surveyQuestions.some((q, idx) => q.type !== 'text' && ratings[idx] === 0)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              {submittingSurvey
                ? <><Loader2 size={15} className="animate-spin" /> 제출 중...</>
                : '제출하기'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 수료증 화면 ──────────────────────────────────────────
  if (screen === 'certificate') {
    const prog = selectedApp?.education_programs
    const cert = certMap[selectedApp?.id]
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={() => setScreen('main')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 print:hidden">
            <ChevronLeft size={16} /> 돌아가기
          </button>
          <div className="print:hidden flex gap-3 mb-6 justify-center">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow hover:opacity-90 transition"
              style={{ background: '#2E75B6' }}
            >
              <Printer size={16} /> 수료증 인쇄
            </button>
            {cert && (
              <a
                href={`/certificate/${cert.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow hover:opacity-90 transition"
                style={{ background: '#059669' }}
              >
                <Award size={16} /> 새 탭에서 열기
              </a>
            )}
          </div>
          <CertificateView
            name={selectedApp?.applicant_name}
            programTitle={prog?.title}
            startDate={prog?.start_date}
            startTime={prog?.start_time}
            endDate={prog?.end_date}
            endTime={prog?.end_time}
            totalHours={prog?.total_hours}
            issuedAt={cert?.issued_at}
            certNumber={cert?.certificate_number}
          />
        </div>
        <style>{`@media print { @page { size: A4; margin: 0; } body { margin: 0; } }`}</style>
      </div>
    )
  }

  // ── 메인 화면 (교육 목록) ────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">안녕하세요,</p>
            <h1 className="text-xl font-extrabold text-white">{studentName}님!</h1>
            <p className="text-white/70 text-sm mt-0.5">신청한 교육 {applications.length}개</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition"
          >
            <X size={15} /> 로그아웃
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {applications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">신청한 교육이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {applications.map(app => {
              const prog = app.education_programs
              const cert = certMap[app.id]
              const isCompleted = app.status === '수료'
              const canCert = isCompleted && app.survey_completed
              return (
                <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                  {/* 교육명 + 상태 뱃지 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <h3 className="font-bold text-gray-800 text-sm leading-snug">{prog?.title || '-'}</h3>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  {/* 교육 기간·장소 */}
                  <div className="text-xs text-gray-500 space-y-1 pl-6">
                    {prog?.start_date && (
                      <div>
                        {prog.start_date === prog.end_date ? (
                          <span>📅 {formatDateTimeDisplay(prog.start_date, prog.start_time)} ~ {formatDateTimeDisplay(prog.end_date, prog.end_time)}</span>
                        ) : (
                          <>
                            <span>📅 {formatDateTimeDisplay(prog.start_date, prog.start_time)}</span>
                            <div>~ {formatDateTimeDisplay(prog.end_date, prog.end_time)}</div>
                          </>
                        )}
                      </div>
                    )}
                    {prog?.location && <div>📍 {prog.location}</div>}
                  </div>

                  {/* 설문 + 수료증 버튼 */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {app.survey_completed ? (
                      <span className="px-2.5 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-lg">
                        ✓ 설문 완료
                      </span>
                    ) : (
                      <>
                        <span className="px-2.5 py-1 text-xs font-bold bg-orange-100 text-orange-600 rounded-lg">
                          설문 미완료
                        </span>
                        <button
                          onClick={() => openSurvey(app)}
                          className="px-3 py-1.5 text-xs font-bold text-white rounded-lg transition hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                        >
                          설문 하기
                        </button>
                      </>
                    )}

                    <div className="relative group ml-auto">
                      <button
                        onClick={() => canCert && openCertificate(app)}
                        disabled={!canCert}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                          canCert
                            ? 'text-white hover:opacity-90'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        style={canCert ? { background: '#2E75B6' } : {}}
                      >
                        <Award size={13} /> 수료증 발급
                      </button>
                      {!canCert && (
                        <div className="absolute bottom-full right-0 mb-1 w-52 text-xs text-white bg-gray-700 rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                          수료 처리 및 설문 완료 후 발급 가능
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    '신청':   'bg-amber-100 text-amber-700',
    '승인':   'bg-blue-100 text-blue-700',
    '수료':   'bg-green-100 text-green-700',
    '미수료': 'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded-lg whitespace-nowrap ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}
