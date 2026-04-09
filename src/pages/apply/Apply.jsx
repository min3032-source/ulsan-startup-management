import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ULSAN_REGIONS, today } from '../../lib/constants'
import { CheckCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import PublicHeader from '../../components/common/PublicHeader'
import StartupTypeQuiz, { VERDICT_INFO } from '../../components/StartupTypeQuiz'

// ── 상수 ─────────────────────────────────────────────────
const METHODS = ['방문', '전화', '화상']

const STEPS = ['창업 유형 자가진단', '상담 신청서 작성', '접수 완료']

// ── 상담 일정 제한 ────────────────────────────────────────
const HOLIDAYS_2026 = [
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18',
  '2026-03-01', '2026-05-01', '2026-05-05', '2026-05-24',
  '2026-06-06', '2026-08-15', '2026-09-30', '2026-10-01',
  '2026-10-02', '2026-10-03', '2026-10-09', '2026-12-25',
]

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
]

function isValidConsultDate(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() // 0=일, 6=토
  if (day === 0 || day === 6) return false
  if (HOLIDAYS_2026.includes(dateStr)) return false
  return true
}

function emptyForm() {
  return {
    name:'', phone:'', email:'', region:'', region_detail:'', gender:'', biz:'', stage:'',
    consult_method:'방문', preferred_date:'', preferred_time:'', inquiry:'',
  }
}

// ── 메인 컴포넌트 ────────────────────────────────────────
export default function Apply() {
  const [step, setStep]       = useState(0)
  const [form, setForm]       = useState(emptyForm())
  const [quizResult, setQuizResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [privacyOpen, setPrivacyOpen]     = useState(false)
  const [stages, setStages] = useState([])

  useEffect(() => {
    supabase.from('team_settings').select('stages').single().then(({ data }) => {
      if (data?.stages) setStages(data.stages)
    })
  }, [])

  const verdict = quizResult?.verdict ?? null
  const vInfo   = verdict ? VERDICT_INFO[verdict] : null

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const step1Done = form.name && form.phone && form.region && form.biz

  async function handleSubmit() {
    if (!privacyAgreed) {
      setError('개인정보 수집·이용에 동의해주세요.')
      return
    }
    setSubmitting(true); setError('')
    const now = new Date().toISOString()
    const { error } = await supabase.from('startup_applications').insert({
      applicant_name: form.name,
      email: form.email,
      phone: form.phone,
      business_name: form.biz,
      business_type: verdict,
      business_stage: form.stage,
      gender: form.gender,
      status: 'pending',
      privacy_agreed: true,
      privacy_agreed_at: now,
      description: JSON.stringify({
        consult_method: form.consult_method,
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time,
        inquiry: form.inquiry,
        region: form.region,
        region_detail: form.region === '기타(타지역)' ? form.region_detail : '',
        gender: form.gender,
        ...(quizResult?.answers || {}),
      }),
    })
    setSubmitting(false)
    if (error) {
      console.error('제출 오류:', error)
      setError(`제출 오류: ${error.message}`)
    } else {
      setStep(2)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <PublicHeader title="창업지원 상담 신청" />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 진행 단계 표시 */}
        {step < 2 && (
          <div className="flex items-center mb-8">
            {STEPS.slice(0,2).map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step ? 'bg-green-500 text-white' :
                    i === step ? 'text-white' : 'bg-gray-200 text-gray-400'
                  }`} style={i === step ? { background: '#2E75B6' } : {}}>
                    {i < step ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-gray-800' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {i < 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 0: 창업 유형 자가진단 ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-1">창업 유형 자가진단</h1>
            </div>
            <StartupTypeQuiz
              onComplete={(result) => {
                setQuizResult(result)
                setStep(1)
              }}
            />
          </div>
        )}

        {/* ── STEP 1: 상담 신청서 ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-1">상담 신청서 작성</h1>
              <p className="text-sm text-gray-500">담당자가 확인 후 연락드립니다</p>
            </div>

            {verdict && vInfo && (
              <div className="rounded-xl p-4 flex items-center gap-3 border"
                style={{ background: vInfo.bg, borderColor: vInfo.color + '60' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: vInfo.color }}>
                  진단
                </div>
                <div>
                  <div className="text-xs text-gray-500">자가진단 결과</div>
                  <div className="font-bold text-sm" style={{ color: vInfo.color }}>{vInfo.label}</div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">신청자 정보</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="이름 *">
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="홍길동" className={input()} />
                </Field>
                <Field label="성별">
                  <div className="flex gap-2">
                    {['남','여'].map(g => (
                      <button key={g} onClick={() => set('gender', g)}
                        className={`flex-1 py-2 rounded-lg text-sm border-2 font-medium transition-all ${
                          form.gender === g ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="연락처 *">
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="010-0000-0000" className={input()} />
                </Field>
                <Field label="이메일">
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="example@email.com" className={input()} />
                </Field>
              </div>
              <Field label="지역 *">
                <select value={form.region} onChange={e => { set('region', e.target.value); set('region_detail', '') }} className={input()}>
                  <option value="">지역 선택</option>
                  {ULSAN_REGIONS.map(r => <option key={r}>{r}</option>)}
                </select>
                {form.region === '기타(타지역)' && (
                  <input
                    value={form.region_detail}
                    onChange={e => set('region_detail', e.target.value)}
                    placeholder="타지역 어디인지 입력해주세요"
                    className={input() + ' mt-2'}
                  />
                )}
              </Field>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">사업 정보</h2>
              <Field label="업종·아이템 *">
                <input value={form.biz} onChange={e => set('biz', e.target.value)}
                  placeholder="예: AI 기반 재고관리 앱, 수제 베이커리 카페" className={input()} />
              </Field>
              <Field label="창업 단계">
                <select value={form.stage} onChange={e => set('stage', e.target.value)} className={input()}>
                  <option value="">선택</option>
                  {stages.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">상담 신청</h2>
              <Field label="상담 방법">
                <div className="flex gap-2">
                  {METHODS.map(m => (
                    <button key={m} onClick={() => set('consult_method', m)}
                      className={`flex-1 py-2 rounded-lg text-sm border-2 font-medium transition-all ${
                        form.consult_method === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="희망 상담일">
                  <input type="date"
                    value={form.preferred_date}
                    min={today()}
                    onChange={e => { set('preferred_date', e.target.value); set('preferred_time', '') }}
                    className={input()} />
                  {form.preferred_date && !isValidConsultDate(form.preferred_date) && (
                    <p className="text-red-500 text-xs mt-1">주말 및 공휴일은 선택할 수 없습니다.</p>
                  )}
                </Field>
                <Field label="희망 시간">
                  <select
                    value={form.preferred_time}
                    onChange={e => set('preferred_time', e.target.value)}
                    disabled={!form.preferred_date || !isValidConsultDate(form.preferred_date)}
                    className={input()}
                  >
                    <option value="">선택 (09:00~17:30, 점심 제외)</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="상담 신청 내용">
                <textarea value={form.inquiry} onChange={e => set('inquiry', e.target.value)}
                  rows={4} placeholder="궁금하신 점이나 상담 받고 싶은 내용을 자유롭게 작성해주세요."
                  className={input() + ' resize-none'} />
              </Field>
            </div>

            {/* ── 개인정보 수집·이용 동의 ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={e => setPrivacyAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-800">
                    개인정보 수집·이용에 동의합니다.
                    <span className="text-red-500 ml-1">(필수)</span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(p => !p)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 flex-shrink-0 font-medium"
                >
                  전문 보기
                  {privacyOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {privacyOpen && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 space-y-2 leading-relaxed">
                  <p className="font-bold text-gray-700 text-sm">개인정보 수집·이용 동의서</p>
                  <div className="space-y-1.5">
                    <p><span className="font-semibold text-gray-700">수집 항목:</span> 이름, 연락처, 이메일, 성별, 지역, 창업유형 진단 결과, 상담 신청 내용</p>
                    <p><span className="font-semibold text-gray-700">수집 목적:</span> 창업 상담 서비스 제공 및 창업 지원사업 안내</p>
                    <p><span className="font-semibold text-gray-700">보유 기간:</span> 상담 완료 후 3년</p>
                  </div>
                  <p className="text-gray-500 pt-1 border-t border-gray-200">
                    귀하는 동의를 거부할 권리가 있으며, 거부 시 상담 신청 서비스 이용이 제한될 수 있습니다.
                  </p>
                  <p className="text-gray-500"><span className="font-semibold text-gray-700">기관명:</span> 울산경제일자리진흥원</p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(0)}
                className="flex items-center gap-1 px-5 py-3 rounded-xl text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
                <ChevronLeft size={15} /> 이전
              </button>
              <button
                disabled={!step1Done || submitting}
                onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ background: step1Done ? '#2E75B6' : '#9CA3AF' }}>
                {submitting ? '제출 중...' : '상담 신청 완료'}
                {!submitting && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: 접수 완료 ── */}
        {step === 2 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: '#EBF3FB' }}>
              <CheckCircle size={40} style={{ color: '#2E75B6' }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">신청이 접수되었습니다!</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              담당자가 신청 내용을 검토 후<br />
              <strong>{form.phone}</strong>으로 연락드리겠습니다.<br />
              {form.preferred_date && `(희망 상담일: ${form.preferred_date} ${form.preferred_time})`}
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-5 text-left mb-8 shadow-sm">
              <div className="text-sm font-bold text-gray-700 mb-3">접수 내용 요약</div>
              <div className="space-y-2 text-sm">
                <Row label="이름" value={form.name} />
                <Row label="연락처" value={form.phone} />
                <Row label="지역" value={form.region === '기타(타지역)' && form.region_detail ? `타지역 (${form.region_detail})` : form.region} />
                <Row label="업종·아이템" value={form.biz} />
                {verdict && vInfo && (
                  <Row label="창업 유형"
                    value={<span className="font-semibold" style={{ color: vInfo.color }}>{vInfo.label}</span>} />
                )}
                <Row label="상담 방법" value={form.consult_method} />
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 text-left border border-blue-100">
              <div className="font-semibold mb-1">📞 담당 부서</div>
              <div className="text-xs text-blue-600">울산경제일자리진흥원 창업지원부</div>
              <div className="text-xs text-blue-500 mt-1">업무시간: 평일 09:00 ~ 18:00</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 헬퍼 컴포넌트 ─────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 min-w-[80px]">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function input() {
  return 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white'
}
