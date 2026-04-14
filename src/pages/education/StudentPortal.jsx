import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import { LogIn, BookOpen, ClipboardList, Award, Star, Printer, ChevronLeft, Loader2, X } from 'lucide-react'
import { CertificateView } from './Education'

const DEFAULT_SURVEY_QUESTIONS = [
  '교육 내용은 창업에 도움이 되었나요?',
  '강사의 강의 전달력은 어땠나요?',
  '교육 환경(장소, 시설)은 만족스러웠나요?',
  '교육 일정과 시간은 적절했나요?',
  '이 교육을 다른 분께 추천하시겠어요?',
]

export default function StudentPortal() {
  const [screen, setScreen] = useState('login') // login | main | survey | certificate
  const [student, setStudent] = useState(null) // application row
  const [cert, setCert] = useState(null)

  // login
  const [loginForm, setLoginForm] = useState({ name: '', phone: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // survey
  const [surveyQuestions, setSurveyQuestions] = useState(DEFAULT_SURVEY_QUESTIONS)
  const [ratings, setRatings] = useState(DEFAULT_SURVEY_QUESTIONS.map(() => 0))
  const [opinion, setOpinion] = useState('')
  const [submittingSurvey, setSubmittingSurvey] = useState(false)
  const [surveyDone, setSurveyDone] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    if (!loginForm.name.trim() || !loginForm.phone.trim() || !loginForm.password.trim()) {
      setLoginError('모든 항목을 입력해주세요.')
      return
    }
    setLoginLoading(true)
    const { data, error } = await supabase
      .from('education_applications')
      .select('*, education_programs(title, start_date, end_date, total_hours, completion_rate, survey_questions)')
      .eq('applicant_name', loginForm.name.trim())
      .eq('phone', loginForm.phone.trim())
      .eq('access_password', loginForm.password.trim())
      .limit(1)
      .single()
    setLoginLoading(false)
    if (error || !data) {
      setLoginError('일치하는 수강생 정보를 찾을 수 없습니다.')
      return
    }
    // 수료증 조회
    const { data: certData } = await supabase
      .from('certificates')
      .select('*')
      .eq('application_id', data.id)
      .maybeSingle()
    const qs = data.education_programs?.survey_questions?.length
      ? data.education_programs.survey_questions
      : DEFAULT_SURVEY_QUESTIONS
    setStudent(data)
    setCert(certData || null)
    setSurveyQuestions(qs)
    setRatings(qs.map(() => 0))
    setOpinion('')
    setSurveyDone(false)
    setScreen('main')
  }

  async function handleSurveySubmit() {
    if (ratings.some(r => r === 0)) {
      alert('모든 질문에 별점을 선택해주세요.')
      return
    }
    setSubmittingSurvey(true)
    const surveyData = {
      answers: ratings,
      opinion,
    }
    const { error } = await supabase
      .from('education_applications')
      .update({
        survey_completed: true,
        survey_data: surveyData,
        survey_completed_at: new Date().toISOString(),
      })
      .eq('id', student.id)
    setSubmittingSurvey(false)
    if (error) { alert('제출 실패: ' + error.message); return }
    setStudent(s => ({ ...s, survey_completed: true, survey_data: surveyData }))
    setSurveyDone(true)
    setScreen('main')
  }

  const prog = student?.education_programs
  const isCompleted = student?.status === '수료'
  const canCertificate = isCompleted && student?.survey_completed

  // ── 로그인 화면 ──
  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
          <div className="text-center mb-8">
            <img src="/logo.gif" alt="울산경제일자리진흥원" className="h-10 w-auto mx-auto mb-3" style={{ filter: 'none' }} />
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
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">비밀번호 (숫자 4자리)</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="••••"
                maxLength={4}
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
              {loginLoading ? '확인 중...' : '확인'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── 만족도 조사 화면 ──
  if (screen === 'survey') {
    if (surveyDone) return null
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
                <p className="text-sm font-medium text-gray-700"><span className="text-gray-400 mr-1">Q{idx + 1}.</span>{q}</p>
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
                  {ratings[idx] > 0 && <span className="self-center text-xs text-gray-400 ml-1">{ratings[idx]}점</span>}
                </div>
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
              disabled={submittingSurvey || ratings.some(r => r === 0)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              {submittingSurvey ? <><Loader2 size={15} className="animate-spin" /> 제출 중...</> : '제출하기'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 수료증 화면 ──
  if (screen === 'certificate') {
    if (!canCertificate) {
      setScreen('main')
      return null
    }
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
            name={student?.applicant_name}
            programTitle={prog?.title}
            startDate={prog?.start_date}
            endDate={prog?.end_date}
            issuedAt={cert?.issued_at}
            certNumber={cert?.certificate_number}
          />
        </div>
        <style>{`@media print { @page { size: A4; margin: 0; } body { margin: 0; } }`}</style>
      </div>
    )
  }

  // ── 수강생 메인 화면 ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">안녕하세요,</p>
            <h1 className="text-xl font-extrabold text-white">{student?.applicant_name}님!</h1>
            <p className="text-white/80 text-sm mt-0.5">{prog?.title}</p>
          </div>
          <button
            onClick={() => { setStudent(null); setCert(null); setScreen('login') }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 수강 정보 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-blue-500" />
            <h2 className="text-base font-bold text-gray-800">수강 정보</h2>
          </div>
          <div className="space-y-2 text-sm">
            <InfoRow label="교육명" value={prog?.title || '-'} />
            <InfoRow
              label="교육 기간"
              value={prog?.start_date && prog?.end_date ? `${prog.start_date} ~ ${prog.end_date}` : '-'}
            />
            <InfoRow label="출석률" value={
              <div className="flex items-center gap-2">
                <div className="flex-1 max-w-24 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-blue-500"
                    style={{ width: `${student?.attendance_rate || 0}%` }}
                  />
                </div>
                <span>{student?.attendance_rate || 0}%</span>
              </div>
            } />
            <InfoRow label="진행 상태" value={
              <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                student?.status === '수료' ? 'bg-green-100 text-green-700' :
                student?.status === '진행중' || student?.status === '승인' ? 'bg-blue-100 text-blue-700' :
                student?.status === '미수료' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-600'
              }`}>{student?.status}</span>
            } />
          </div>
        </div>

        {/* 만족도 조사 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={18} className="text-purple-500" />
            <h2 className="text-base font-bold text-gray-800">만족도 조사</h2>
          </div>
          {student?.survey_completed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg">조사완료</span>
                {student.survey_data && (() => {
                  const vals = (
                    student.survey_data.answers
                      ? student.survey_data.answers
                      : [student.survey_data.q1, student.survey_data.q2, student.survey_data.q3, student.survey_data.q4, student.survey_data.q5]
                  ).filter(v => v != null && v > 0)
                  if (!vals.length) return null
                  const avg = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
                  return (
                    <span className="text-sm text-gray-500">
                      평균 <span className="font-bold text-yellow-500">{avg}점</span>
                    </span>
                  )
                })()}
              </div>
              <p className="text-xs text-gray-400">만족도 조사에 참여해주셔서 감사합니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">아직 만족도 조사를 완료하지 않으셨습니다.</p>
              <button
                onClick={() => setScreen('survey')}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
              >
                만족도 조사 참여하기 →
              </button>
            </div>
          )}
        </div>

        {/* 수료증 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-amber-500" />
            <h2 className="text-base font-bold text-gray-800">수료증 발급</h2>
          </div>
          {canCertificate ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                <p className="text-sm text-gray-700 font-medium">수료증 발급이 가능합니다!</p>
              </div>
              {cert?.certificate_number && (
                <p className="text-xs text-gray-400">수료증 번호: {cert.certificate_number}</p>
              )}
              <button
                onClick={() => setScreen('certificate')}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
              >
                수료증 보기 / 인쇄 →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 leading-relaxed">
                수료증은 아래 조건을 모두 충족한 경우에만 발급됩니다:
              </p>
              <ul className="space-y-1.5">
                <Condition
                  done={isCompleted}
                  label={`수료 처리 완료 (현재 상태: ${student?.status})`}
                />
                <Condition
                  done={!!student?.survey_completed}
                  label="만족도 조사 완료"
                />
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 text-xs w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-gray-800 font-medium text-xs flex-1">{value}</span>
    </div>
  )
}

function Condition({ done, label }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 ${done ? 'bg-green-400' : 'bg-gray-200'}`}>
        {done ? '✓' : ''}
      </span>
      <span className={done ? 'text-gray-700 line-through' : 'text-gray-500'}>{label}</span>
    </li>
  )
}
