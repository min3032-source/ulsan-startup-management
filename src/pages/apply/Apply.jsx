import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ULSAN_REGIONS, today } from '../../lib/constants'
import { CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import PublicHeader from '../../components/common/PublicHeader'

// ── 상수 ─────────────────────────────────────────────────
const STAGES = ['아이디어 단계', '준비 중', '초기(1년 미만)', '운영 중', '성장기']
const METHODS = ['방문', '전화', '화상']

const QUESTIONS = [
  { key: 'q1', type: 'yesno',   text: '현재 온라인으로 제품/서비스 판매가 가능한가요?' },
  { key: 'q2', type: 'yesno',   text: '소프트웨어, 앱, 플랫폼이 사업의 핵심인가요?' },
  { key: 'q3', type: 'yesno',   text: '특허, 저작권, 독점 기술 등 지식재산권을 보유하고 있나요?' },
  { key: 'q4', type: 'yesno',   text: '추가 인원·공간 없이 전국 고객에게 서비스할 수 있나요?' },
  { key: 'q5', type: 'scale5',  text: '기술 개발이나 데이터 분석에 지속적으로 투자할 계획인가요?' },
  { key: 'q6', type: 'scale5',  text: '오프라인 현장이나 대면 서비스가 사업의 핵심인가요?' },
  { key: 'q7', type: 'scale5',  text: '대표님이 매일 현장에 있어야 사업 운영이 가능한가요?' },
  { key: 'q8', type: 'scale5',  text: '지역 주민과의 신뢰·관계가 사업 유지에 필수적인가요?' },
  {
    key: 'q9', type: 'choice3', text: '초기 창업 자금의 가장 큰 비중은 어디에 쓰이나요?',
    options: ['매장 임대·인테리어·장비', '개발자 인건비·서버·소프트웨어', '공장 설비·R&D·시제품 제작'],
  },
]

const SCALE5 = [
  { val: 5, label: '매우\n그렇다' },
  { val: 4, label: '그렇다' },
  { val: 3, label: '보통' },
  { val: 2, label: '아니다' },
  { val: 1, label: '전혀\n아니다' },
]

const VERDICT_INFO = {
  '테크 창업': {
    color: '#2E75B6', bg: '#EBF3FB', emoji: '🚀',
    label: '테크 창업',
    desc: '기술·플랫폼 기반의 확장 가능한 사업 모델입니다. 초기창업패키지, R&D지원, 투자연계 프로그램이 적합합니다.',
    btnLabel: '테크 분야 창업 상담 신청하기',
  },
  '로컬 창업': {
    color: '#1E5631', bg: '#EBF5EE', emoji: '🏘️',
    label: '로컬 창업',
    desc: '지역 기반의 생활밀착형 사업 모델입니다. 로컬크리에이터, 창업자금융자 프로그램이 적합합니다.',
    btnLabel: '로컬 분야 창업 상담 신청하기',
  },
}

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
    q1:'', q2:'', q3:'', q4:'', q5:'', q6:'', q7:'', q8:'', q9:'',
    name:'', phone:'', email:'', region:'', region_detail:'', gender:'', biz:'', stage:'',
    consult_method:'방문', preferred_date:'', preferred_time:'', inquiry:'',
  }
}

// ── 점수 계산 ────────────────────────────────────────────
function calcScores(form) {
  let tech = 0, local = 0

  // Q1 yesno
  if (form.q1 === 'yes') tech += 2; else if (form.q1 === 'no') local += 2
  // Q2 yesno
  if (form.q2 === 'yes') tech += 2; else if (form.q2 === 'no') local += 2
  // Q3 yesno
  if (form.q3 === 'yes') tech += 2; else if (form.q3 === 'no') local += 1
  // Q4 yesno
  if (form.q4 === 'yes') tech += 2; else if (form.q4 === 'no') local += 2

  // Q5 scale5 (tech-leaning)
  const v5 = Number(form.q5)
  if (v5 === 5) tech += 2; else if (v5 === 4) tech += 1
  else if (v5 === 2) local += 1; else if (v5 === 1) local += 2

  // Q6 scale5 (local-leaning)
  const v6 = Number(form.q6)
  if (v6 === 5) local += 2; else if (v6 === 4) local += 1
  else if (v6 === 2) tech += 1; else if (v6 === 1) tech += 2

  // Q7 scale5 (local-leaning)
  const v7 = Number(form.q7)
  if (v7 === 5) local += 2; else if (v7 === 4) local += 1
  else if (v7 === 2) tech += 1; else if (v7 === 1) tech += 2

  // Q8 scale5 (local-leaning, 아니다·전혀아니다 둘 다 tech+1)
  const v8 = Number(form.q8)
  if (v8 === 5) local += 2; else if (v8 === 4) local += 1
  else if (v8 === 2) tech += 1; else if (v8 === 1) tech += 1

  // Q9 choice3
  if (form.q9 === '매장 임대·인테리어·장비') local += 3
  else if (form.q9 === '개발자 인건비·서버·소프트웨어') tech += 3
  else if (form.q9 === '공장 설비·R&D·시제품 제작') tech += 2

  return { tech, local }
}

function calcVerdict(form) {
  if (!QUESTIONS.every(q => form[q.key] !== '')) return null
  const { tech, local } = calcScores(form)
  return tech > local ? '테크 창업' : '로컬 창업'
}

// ── 차트 좌표 계산 ────────────────────────────────────────
// X: 시장 확장성 (Q1·Q2·Q4 기반)  Y: 기술 집약도 (전체 점수 비율)
function getChartPos(form) {
  const xScore = (form.q1 === 'yes' ? 2 : 0) + (form.q2 === 'yes' ? 1 : 0) + (form.q4 === 'yes' ? 2 : 0)
  const xRatio = xScore / 5  // 0~1

  const { tech, local } = calcScores(form)
  const total = tech + local
  const yRatio = total > 0 ? tech / total : 0.5  // 0=로컬, 1=테크

  return { xRatio, yRatio }
}

// ── 2D 매트릭스 차트 ─────────────────────────────────────
function MatrixChart({ form }) {
  const X1 = 52, X2 = 288, Y1 = 12, Y2 = 162
  const W = X2 - X1, H = Y2 - Y1
  const midX = X1 + W / 2, midY = Y1 + H / 2

  const { xRatio, yRatio } = getChartPos(form)
  // SVG y는 위가 0이므로 yRatio가 클수록 위(tech)로 표시
  const dotX = X1 + xRatio * W
  const dotY = Y2 - yRatio * H

  return (
    <svg viewBox="0 0 300 195" className="w-full" style={{ maxHeight: 210 }}>
      {/* 사분면 배경 */}
      <rect x={X1} y={Y1} width={W/2} height={H/2} fill="#EBF3FB" opacity="0.75" />
      <rect x={midX} y={Y1} width={W/2} height={H/2} fill="#2E75B6" opacity="0.13" />
      <rect x={X1} y={midY} width={W/2} height={H/2} fill="#EBF5EE" opacity="0.75" />
      <rect x={midX} y={midY} width={W/2} height={H/2} fill="#FBF5E6" opacity="0.75" />

      {/* 구분선 */}
      <line x1={midX} y1={Y1} x2={midX} y2={Y2} stroke="#bbb" strokeWidth="1" strokeDasharray="4,3" />
      <line x1={X1} y1={midY} x2={X2} y2={midY} stroke="#bbb" strokeWidth="1" strokeDasharray="4,3" />

      {/* 테두리 */}
      <rect x={X1} y={Y1} width={W} height={H} fill="none" stroke="#bbb" strokeWidth="1.5" rx="2" />

      {/* 사분면 레이블 */}
      <text x={X1 + W*0.25} y={Y1 + 14} textAnchor="middle" fontSize="8.5" fill="#1a5276" fontWeight="500">로컬 하이테크</text>
      <text x={X1 + W*0.75} y={Y1 + 14} textAnchor="middle" fontSize="8.5" fill="#1a4a8c" fontWeight="600">글로벌 테크</text>
      <text x={X1 + W*0.25} y={Y2 - 6} textAnchor="middle" fontSize="8.5" fill="#1e5631">지역 밀착형</text>
      <text x={X1 + W*0.75} y={Y2 - 6} textAnchor="middle" fontSize="8.5" fill="#8B6914">확장형 로컬</text>

      {/* X축 레이블 */}
      <text x={X1} y={Y2 + 13} textAnchor="start" fontSize="8" fill="#aaa">← 지역 밀착</text>
      <text x={(X1+X2)/2} y={Y2 + 13} textAnchor="middle" fontSize="9" fill="#555" fontWeight="bold">시장 확장성</text>
      <text x={X2} y={Y2 + 13} textAnchor="end" fontSize="8" fill="#aaa">글로벌 →</text>

      {/* Y축 레이블 (회전) */}
      <text
        x={X1 - 10} y={(Y1+Y2)/2}
        textAnchor="middle" fontSize="9" fill="#555" fontWeight="bold"
        transform={`rotate(-90, ${X1 - 10}, ${(Y1+Y2)/2})`}
      >기술 집약도</text>
      <text x={X1 - 4} y={Y1 + 6} textAnchor="middle" fontSize="7.5" fill="#aaa"
        transform={`rotate(-90, ${X1 - 4}, ${Y1 + 6})`}>기술집약 ↑</text>
      <text x={X1 - 4} y={Y2 - 4} textAnchor="middle" fontSize="7.5" fill="#aaa"
        transform={`rotate(-90, ${X1 - 4}, ${Y2 - 4})`}>노동집약 ↓</text>

      {/* 점 */}
      <circle cx={dotX} cy={dotY} r={13} fill="#2E75B6" opacity="0.15" />
      <circle cx={dotX} cy={dotY} r={7} fill="#2E75B6" opacity="0.85" />
      <circle cx={dotX} cy={dotY} r={2.5} fill="white" />
    </svg>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────
export default function Apply() {
  const [step, setStep]   = useState(0)
  const [form, setForm]   = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const verdict = calcVerdict(form)
  const vInfo   = verdict ? VERDICT_INFO[verdict] : null

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const step0Done = QUESTIONS.every(q => form[q.key] !== '')
  const step1Done = form.name && form.phone && form.region && form.biz

  async function handleSubmit() {
    setSubmitting(true); setError('')
    const { error } = await supabase.from('startup_applications').insert({
      applicant_name: form.name,
      email: form.email,
      phone: form.phone,
      business_name: form.biz,
      business_type: verdict,
      business_stage: form.stage,
      status: 'pending',
      description: JSON.stringify({
        consult_method: form.consult_method,
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time,
        inquiry: form.inquiry,
        region: form.region,
        region_detail: form.region === '기타(타지역)' ? form.region_detail : '',
        gender: form.gender,
        q1: form.q1, q2: form.q2, q3: form.q3,
        q4: form.q4, q5: form.q5, q6: form.q6,
        q7: form.q7, q8: form.q8, q9: form.q9,
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
              <p className="text-sm text-gray-500">9개 질문으로 내 창업 유형을 확인하세요</p>
            </div>

            {QUESTIONS.map((q, idx) => (
              <div key={q.key} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ background: '#2E75B6' }}>
                    {idx + 1}
                  </span>
                  <p className="text-sm font-medium text-gray-800 leading-relaxed">{q.text}</p>
                </div>

                {/* 예/아니오 */}
                {q.type === 'yesno' && (
                  <div className="flex gap-3 pl-9">
                    {[{ val: 'yes', label: '예' }, { val: 'no', label: '아니오' }].map(({ val, label }) => (
                      <button key={val} onClick={() => set(q.key, val)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                          form[q.key] === val
                            ? val === 'yes'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-400 bg-gray-50 text-gray-700'
                            : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* 5점 척도 (텍스트만, 숫자 없음) */}
                {q.type === 'scale5' && (
                  <div className="flex gap-1.5 pl-9">
                    {SCALE5.map(({ val, label }) => {
                      const lines = label.split('\n')
                      const selected = form[q.key] === val
                      return (
                        <button key={val} onClick={() => set(q.key, val)}
                          className={`flex-1 py-2.5 rounded-lg border-2 transition-all text-center ${
                            selected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          {lines.map((line, i) => (
                            <div key={i} className={`text-[11px] font-semibold leading-tight ${selected ? 'text-blue-700' : 'text-gray-500'}`}>
                              {line}
                            </div>
                          ))}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* 3지선다 */}
                {q.type === 'choice3' && (
                  <div className="flex flex-col sm:flex-row gap-2 pl-9">
                    {q.options.map((opt, i) => (
                      <button key={opt} onClick={() => set(q.key, opt)}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm border-2 transition-all text-left ${
                          form[q.key] === opt
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        <span className="font-bold mr-1">{'①②③'[i]}</span>{opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* 결과 카드 */}
            {step0Done && verdict && vInfo && (
              <div className="rounded-xl border-2 overflow-hidden shadow-sm" style={{ borderColor: vInfo.color }}>
                <div className="p-6 text-center" style={{ background: vInfo.bg }}>
                  <div className="text-4xl mb-2">{vInfo.emoji}</div>
                  <div className="text-2xl font-bold mb-2" style={{ color: vInfo.color }}>{vInfo.label}</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{vInfo.desc}</p>
                </div>

                <div className="bg-white px-4 pt-4 pb-2">
                  <div className="text-xs font-semibold text-gray-400 mb-2 text-center tracking-wide uppercase">포지셔닝 맵</div>
                  <MatrixChart form={form} />
                </div>

                <div className="bg-white px-4 pb-4">
                  <button onClick={() => setStep(1)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
                    style={{ background: vInfo.color }}>
                    {vInfo.btnLabel} <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {!step0Done && (
              <p className="text-center text-xs text-gray-400 pt-2">
                9개 질문에 모두 답하면 유형 결과가 표시됩니다
              </p>
            )}
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
                  {STAGES.map(s => <option key={s}>{s}</option>)}
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
