import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

// ── 질문 목록 ─────────────────────────────────────────────
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

export const VERDICT_INFO = {
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

// ── 점수 계산 ────────────────────────────────────────────
export function calcQuizScores(form) {
  let tech = 0, local = 0

  if (form.q1 === 'yes') tech += 2; else if (form.q1 === 'no') local += 2
  if (form.q2 === 'yes') tech += 2; else if (form.q2 === 'no') local += 2
  if (form.q3 === 'yes') tech += 2; else if (form.q3 === 'no') local += 1
  if (form.q4 === 'yes') tech += 2; else if (form.q4 === 'no') local += 2

  const v5 = Number(form.q5)
  if (v5 === 5) tech += 2; else if (v5 === 4) tech += 1
  else if (v5 === 2) local += 1; else if (v5 === 1) local += 2

  const v6 = Number(form.q6)
  if (v6 === 5) local += 2; else if (v6 === 4) local += 1
  else if (v6 === 2) tech += 1; else if (v6 === 1) tech += 2

  const v7 = Number(form.q7)
  if (v7 === 5) local += 2; else if (v7 === 4) local += 1
  else if (v7 === 2) tech += 1; else if (v7 === 1) tech += 2

  const v8 = Number(form.q8)
  if (v8 === 5) local += 2; else if (v8 === 4) local += 1
  else if (v8 === 2) tech += 1; else if (v8 === 1) tech += 1

  if (form.q9 === '매장 임대·인테리어·장비') local += 3
  else if (form.q9 === '개발자 인건비·서버·소프트웨어') tech += 3
  else if (form.q9 === '공장 설비·R&D·시제품 제작') tech += 2

  return { tech, local }
}

export function calcQuizVerdict(form) {
  if (!QUESTIONS.every(q => form[q.key] !== '')) return null
  const { tech, local } = calcQuizScores(form)
  return tech > local ? '테크 창업' : '로컬 창업'
}

// ── 차트 좌표 계산 ────────────────────────────────────────
function getChartPos(form) {
  const xScore = (form.q1 === 'yes' ? 2 : 0) + (form.q2 === 'yes' ? 1 : 0) + (form.q4 === 'yes' ? 2 : 0)
  const xRatio = xScore / 5

  const { tech, local } = calcQuizScores(form)
  const total = tech + local
  const yRatio = total > 0 ? tech / total : 0.5

  return { xRatio, yRatio }
}

// ── 2D 매트릭스 차트 ─────────────────────────────────────
function MatrixChart({ form }) {
  const X1 = 52, X2 = 288, Y1 = 12, Y2 = 162
  const W = X2 - X1, H = Y2 - Y1
  const midX = X1 + W / 2, midY = Y1 + H / 2

  const { xRatio, yRatio } = getChartPos(form)
  const dotX = X1 + xRatio * W
  const dotY = Y2 - yRatio * H

  return (
    <svg viewBox="0 0 300 195" className="w-full" style={{ maxHeight: 210 }}>
      <rect x={X1} y={Y1} width={W/2} height={H/2} fill="#EBF3FB" opacity="0.75" />
      <rect x={midX} y={Y1} width={W/2} height={H/2} fill="#2E75B6" opacity="0.13" />
      <rect x={X1} y={midY} width={W/2} height={H/2} fill="#EBF5EE" opacity="0.75" />
      <rect x={midX} y={midY} width={W/2} height={H/2} fill="#FBF5E6" opacity="0.75" />

      <line x1={midX} y1={Y1} x2={midX} y2={Y2} stroke="#bbb" strokeWidth="1" strokeDasharray="4,3" />
      <line x1={X1} y1={midY} x2={X2} y2={midY} stroke="#bbb" strokeWidth="1" strokeDasharray="4,3" />
      <rect x={X1} y={Y1} width={W} height={H} fill="none" stroke="#bbb" strokeWidth="1.5" rx="2" />

      <text x={X1 + W*0.25} y={Y1 + 14} textAnchor="middle" fontSize="8.5" fill="#1a5276" fontWeight="500">로컬 하이테크</text>
      <text x={X1 + W*0.75} y={Y1 + 14} textAnchor="middle" fontSize="8.5" fill="#1a4a8c" fontWeight="600">글로벌 테크</text>
      <text x={X1 + W*0.25} y={Y2 - 6} textAnchor="middle" fontSize="8.5" fill="#1e5631">지역 밀착형</text>
      <text x={X1 + W*0.75} y={Y2 - 6} textAnchor="middle" fontSize="8.5" fill="#8B6914">확장형 로컬</text>

      <text x={X1} y={Y2 + 13} textAnchor="start" fontSize="8" fill="#aaa">← 지역 밀착</text>
      <text x={(X1+X2)/2} y={Y2 + 13} textAnchor="middle" fontSize="9" fill="#555" fontWeight="bold">시장 확장성</text>
      <text x={X2} y={Y2 + 13} textAnchor="end" fontSize="8" fill="#aaa">글로벌 →</text>

      <text
        x={X1 - 10} y={(Y1+Y2)/2}
        textAnchor="middle" fontSize="9" fill="#555" fontWeight="bold"
        transform={`rotate(-90, ${X1 - 10}, ${(Y1+Y2)/2})`}
      >기술 집약도</text>
      <text x={X1 - 4} y={Y1 + 6} textAnchor="middle" fontSize="7.5" fill="#aaa"
        transform={`rotate(-90, ${X1 - 4}, ${Y1 + 6})`}>기술집약 ↑</text>
      <text x={X1 - 4} y={Y2 - 4} textAnchor="middle" fontSize="7.5" fill="#aaa"
        transform={`rotate(-90, ${X1 - 4}, ${Y2 - 4})`}>노동집약 ↓</text>

      <circle cx={dotX} cy={dotY} r={13} fill="#2E75B6" opacity="0.15" />
      <circle cx={dotX} cy={dotY} r={7} fill="#2E75B6" opacity="0.85" />
      <circle cx={dotX} cy={dotY} r={2.5} fill="white" />
    </svg>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
// Props:
//   onComplete({ verdict, scores: { tech, local }, answers: { q1..q9 } })
export default function StartupTypeQuiz({ onComplete }) {
  const [form, setForm] = useState({
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '',
  })

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const allDone = QUESTIONS.every(q => form[q.key] !== '')
  const verdict = allDone ? calcQuizVerdict(form) : null
  const vInfo   = verdict ? VERDICT_INFO[verdict] : null

  function handleComplete() {
    if (!verdict) return
    const scores = calcQuizScores(form)
    onComplete({ verdict, scores, answers: { ...form } })
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-500">9개 질문으로 내 창업 유형을 확인하세요</p>
      </div>

      {QUESTIONS.map((q, idx) => (
        <div key={q.key} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
              style={{ background: '#2E75B6' }}
            >
              {idx + 1}
            </span>
            <p className="text-sm font-medium text-gray-800 leading-relaxed">{q.text}</p>
          </div>

          {q.type === 'yesno' && (
            <div className="flex gap-3 pl-9">
              {[{ val: 'yes', label: '예' }, { val: 'no', label: '아니오' }].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => set(q.key, val)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                    form[q.key] === val
                      ? val === 'yes'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-400 bg-gray-50 text-gray-700'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {q.type === 'scale5' && (
            <div className="flex gap-1.5 pl-9">
              {SCALE5.map(({ val, label }) => {
                const lines = label.split('\n')
                const selected = form[q.key] === val
                return (
                  <button
                    key={val}
                    onClick={() => set(q.key, val)}
                    className={`flex-1 py-2.5 rounded-lg border-2 transition-all text-center ${
                      selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
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

          {q.type === 'choice3' && (
            <div className="flex flex-col sm:flex-row gap-2 pl-9">
              {q.options.map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => set(q.key, opt)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm border-2 transition-all text-left ${
                    form[q.key] === opt
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="font-bold mr-1">{'①②③'[i]}</span>{opt}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {allDone && vInfo && (
        <div className="rounded-xl border-2 overflow-hidden shadow-sm" style={{ borderColor: vInfo.color }}>
          <div className="p-5 text-center" style={{ background: vInfo.bg }}>
            <div className="text-4xl mb-2">{vInfo.emoji}</div>
            <div className="text-2xl font-bold mb-2" style={{ color: vInfo.color }}>{vInfo.label}</div>
            <p className="text-sm text-gray-600 leading-relaxed">{vInfo.desc}</p>
          </div>

          <div className="bg-white px-4 pt-4 pb-2">
            <div className="text-xs font-semibold text-gray-400 mb-2 text-center tracking-wide uppercase">포지셔닝 맵</div>
            <MatrixChart form={form} />
          </div>

          <div className="bg-white px-4 pb-4">
            <button
              onClick={handleComplete}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: vInfo.color }}
            >
              {vInfo.btnLabel} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {!allDone && (
        <p className="text-center text-xs text-gray-400 pt-2">
          9개 질문에 모두 답하면 유형 결과가 표시됩니다
        </p>
      )}
    </div>
  )
}
