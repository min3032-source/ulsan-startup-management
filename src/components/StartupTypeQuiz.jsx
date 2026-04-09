import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

// ── 질문 목록 (Q1~Q9) ────────────────────────────────────
const QUESTIONS = [
  { key: 'q1', type: 'yesno',   text: '현재 온라인으로 제품/서비스 판매가 가능한가요?' },
  { key: 'q2', type: 'yesno',   text: '소프트웨어, 앱, 플랫폼이 사업의 핵심인가요?' },
  { key: 'q3', type: 'yesno',   text: '특허, 저작권, 독점 기술 등 지식재산권을 보유하고 있나요?' },
  { key: 'q4', type: 'yesno',   text: '추가 인원·공간 없이 전국 고객에게 서비스할 수 있나요?' },
  { key: 'q5', type: 'scale5',  text: '기술 개발이나 데이터 분석에 지속적으로 투자할 계획인가요?' },
  { key: 'q6', type: 'scale5',  text: '오프라인 현장이나 대면 서비스가 사업의 핵심인가요?' },
  { key: 'q7', type: 'scale5',  text: '대표님이 매일 현장에 있어야 사업 운영이 가능한가요?' },
  { key: 'q8', type: 'scale5',  text: '고객과의 지속적인 대면 관계와 신뢰가 사업의 핵심인가요?' },
  {
    key: 'q9', type: 'choice4', text: '초기 창업 자금의 가장 큰 비중은 어디에 쓰이나요?',
    options: [
      '매장 임대·인테리어·장비·현장 인력 채용',
      '앱·웹·플랫폼·소프트웨어 개발비',
      '공장 설비·R&D·시제품 제작·특허 출원',
      '마케팅·브랜딩·SNS·유통망 구축',
    ],
  },
]

const SCALE5 = [
  { val: 5, label: '매우\n그렇다' },
  { val: 4, label: '그렇다' },
  { val: 3, label: '보통' },
  { val: 2, label: '아니다' },
  { val: 1, label: '전혀\n아니다' },
]

// Q10: diff -2 ~ +2일 때만 표시하는 최종 결정 질문
const Q10_OPTIONS = [
  {
    val: 'tech',
    emoji: '🖥️',
    label: '기술/디지털 기반',
    desc: '소프트웨어, 플랫폼, 제조기술 중심으로 전국 고객을 대상으로 합니다',
  },
  {
    val: 'local',
    emoji: '🏘️',
    label: '지역/현장 기반',
    desc: '지역 주민을 대상으로 오프라인 현장에서 서비스를 제공합니다',
  },
  {
    val: 'undecided',
    emoji: '🤝',
    label: '아직 잘 모르겠어요',
    desc: '전문가와 상담 후 결정하고 싶습니다',
  },
]

export const VERDICT_INFO = {
  '테크 창업': {
    color: '#2E75B6', bg: '#EBF3FB', emoji: '🚀',
    label: '테크 창업',
    desc: '기술·플랫폼 기반의 확장 가능한 사업 모델입니다. 소프트웨어, 플랫폼, 제조기술 중심의 창업에 적합합니다.\n초기창업패키지, R&D지원, 투자연계 프로그램을 안내드립니다.',
    btnLabel: '테크 분야 창업 상담 신청하기',
  },
  '로컬 창업': {
    color: '#1E5631', bg: '#EBF5EE', emoji: '🏘️',
    label: '로컬 창업',
    desc: '지역 기반의 생활밀착형 사업 모델입니다. 지역 주민을 대상으로 한 오프라인 중심 창업에 적합합니다.\n로컬크리에이터, 창업자금융자 프로그램을 안내드립니다.',
    btnLabel: '로컬 분야 창업 상담 신청하기',
  },
  '상담 후 결정': {
    color: '#D97706', bg: '#FFFBEB', emoji: '💬',
    label: '상담 후 결정',
    desc: '기술성과 지역성이 혼재하는 사업 모델입니다.\n담당 컨설턴트와의 1:1 상담을 통해 최적의 창업유형을 결정해드립니다.\n아래 버튼을 눌러 상담을 신청해주세요.',
    btnLabel: '상담 신청하기',
  },
}

// ── 점수 계산 ────────────────────────────────────────────
// Q1~Q4: yes → 테크+2, no → 로컬+N
// Q5~Q8: 5점 척도 (5→+2, 4→+1, 3→0, 2→-1, 1→-2) → 해당 항목 가산
// Q9: 3지선다
export function calcQuizScores(form) {
  let tech = 0, local = 0

  // Q1~Q4 (yes/no)
  if (form.q1 === 'yes') tech  += 2; else if (form.q1 === 'no') local += 2
  if (form.q2 === 'yes') tech  += 2; else if (form.q2 === 'no') local += 2
  if (form.q3 === 'yes') tech  += 2; else if (form.q3 === 'no') local += 1
  if (form.q4 === 'yes') tech  += 2; else if (form.q4 === 'no') local += 2

  // 5점 척도 → -2 ~ +2 변환
  const sc = v => (Number(v) ? Number(v) - 3 : 0)
  tech  += sc(form.q5)   // Q5 기술투자 → 테크
  local += sc(form.q6)   // Q6 오프라인 → 로컬
  local += sc(form.q7)   // Q7 현장 의존 → 로컬
  local += sc(form.q8)   // Q8 지역신뢰 → 로컬

  // Q9 자금 용처 (4지선다)
  if      (form.q9 === '매장 임대·인테리어·장비·현장 인력 채용')    local += 3
  else if (form.q9 === '앱·웹·플랫폼·소프트웨어 개발비')           tech  += 3
  else if (form.q9 === '공장 설비·R&D·시제품 제작·특허 출원')       tech  += 2
  else if (form.q9 === '마케팅·브랜딩·SNS·유통망 구축') { tech += 1; local += 1 }

  return { tech, local }
}

// q10: 'tech' | 'local' | 'undecided' | ''
export function calcQuizVerdict(form, q10 = '') {
  if (!QUESTIONS.every(q => form[q.key] !== '')) return null
  const { tech, local } = calcQuizScores(form)
  const diff = tech - local
  if (diff >= 3)  return '테크 창업'
  if (diff <= -3) return '로컬 창업'
  // diff -2 ~ +2: Q10으로 결정
  if (!q10) return null
  if (q10 === 'tech')  return '테크 창업'
  if (q10 === 'local') return '로컬 창업'
  return '상담 후 결정'
}

// ── 포지셔닝 맵 좌표 ──────────────────────────────────────
// x축: techScore 기반 (높을수록 오른쪽 = 시장확장성)
// y축: diff 기반 (높을수록 위 = 기술집약도)
function getChartPos(form) {
  const { tech, local } = calcQuizScores(form)
  const diff = tech - local
  const xRatio = Math.min(Math.max(tech / 15, 0), 1)
  const yRatio = Math.min(Math.max((diff + 15) / 30, 0), 1)
  return { xRatio, yRatio }
}

// ── 포지셔닝 맵 SVG ───────────────────────────────────────
function MatrixChart({ form, verdict }) {
  const X1 = 52, X2 = 288, Y1 = 12, Y2 = 162
  const W = X2 - X1, H = Y2 - Y1
  const midX = X1 + W / 2, midY = Y1 + H / 2

  const { xRatio, yRatio } = getChartPos(form)
  const dotX = X1 + xRatio * W
  const dotY = Y2 - yRatio * H

  const dotColor =
    verdict === '테크 창업' ? '#2E75B6'
    : verdict === '로컬 창업' ? '#1E5631'
    : '#D97706'

  return (
    <svg viewBox="0 0 300 195" className="w-full" style={{ maxHeight: 210 }}>
      {/* 배경 사분면 */}
      <rect x={X1} y={Y1} width={W/2} height={H/2} fill="#EBF3FB" opacity="0.75" />
      <rect x={midX} y={Y1} width={W/2} height={H/2} fill="#2E75B6" opacity="0.13" />
      <rect x={X1} y={midY} width={W/2} height={H/2} fill="#EBF5EE" opacity="0.75" />
      <rect x={midX} y={midY} width={W/2} height={H/2} fill="#FBF5E6" opacity="0.75" />

      {/* 판정 영역 하이라이트 */}
      {verdict === '테크 창업' && (
        <rect x={midX} y={Y1} width={W/2} height={H/2} fill="#2E75B6" opacity="0.18" rx="2" />
      )}
      {verdict === '로컬 창업' && (
        <rect x={X1} y={midY} width={W/2} height={H/2} fill="#1E5631" opacity="0.18" rx="2" />
      )}

      <line x1={midX} y1={Y1} x2={midX} y2={Y2} stroke="#bbb" strokeWidth="1" strokeDasharray="4,3" />
      <line x1={X1} y1={midY} x2={X2} y2={midY} stroke="#bbb" strokeWidth="1" strokeDasharray="4,3" />
      <rect x={X1} y={Y1} width={W} height={H} fill="none" stroke="#bbb" strokeWidth="1.5" rx="2" />

      <text x={X1 + W*0.25} y={Y1 + 14} textAnchor="middle" fontSize="8.5" fill="#1a5276" fontWeight="500">로컬 하이테크</text>
      <text x={X1 + W*0.75} y={Y1 + 14} textAnchor="middle" fontSize="8.5" fill="#1a4a8c" fontWeight="600">글로벌 테크</text>
      <text x={X1 + W*0.25} y={Y2 - 6}  textAnchor="middle" fontSize="8.5" fill="#1e5631">지역 밀착형</text>
      <text x={X1 + W*0.75} y={Y2 - 6}  textAnchor="middle" fontSize="8.5" fill="#8B6914">확장형 로컬</text>

      <text x={X1} y={Y2 + 13} textAnchor="start"  fontSize="8" fill="#aaa">← 지역 밀착</text>
      <text x={(X1+X2)/2} y={Y2 + 13} textAnchor="middle" fontSize="9" fill="#555" fontWeight="bold">시장 확장성</text>
      <text x={X2} y={Y2 + 13} textAnchor="end"    fontSize="8" fill="#aaa">글로벌 →</text>

      <text x={X1-10} y={(Y1+Y2)/2} textAnchor="middle" fontSize="9" fill="#555" fontWeight="bold"
        transform={`rotate(-90, ${X1-10}, ${(Y1+Y2)/2})`}>기술 집약도</text>
      <text x={X1-4} y={Y1+6} textAnchor="middle" fontSize="7.5" fill="#aaa"
        transform={`rotate(-90, ${X1-4}, ${Y1+6})`}>기술집약 ↑</text>
      <text x={X1-4} y={Y2-4} textAnchor="middle" fontSize="7.5" fill="#aaa"
        transform={`rotate(-90, ${X1-4}, ${Y2-4})`}>노동집약 ↓</text>

      <circle cx={dotX} cy={dotY} r={13} fill={dotColor} opacity="0.15" />
      <circle cx={dotX} cy={dotY} r={7}  fill={dotColor} opacity="0.85" />
      <circle cx={dotX} cy={dotY} r={2.5} fill="white" />
    </svg>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
// onComplete({ verdict, scores: { tech, local }, answers: { q1..q9, q10 } })
export default function StartupTypeQuiz({ onComplete }) {
  const [form, setForm] = useState({
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '',
  })
  const [q10, setQ10] = useState('')

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const q1to9Done = QUESTIONS.every(q => form[q.key] !== '')
  const scores    = q1to9Done ? calcQuizScores(form) : null
  const diff      = scores ? scores.tech - scores.local : null
  const needsQ10  = q1to9Done && diff !== null && diff >= -2 && diff <= 2

  const verdict = calcQuizVerdict(form, needsQ10 ? q10 : 'skip')
  const vInfo   = verdict ? VERDICT_INFO[verdict] : null

  function handleComplete() {
    if (!verdict) return
    onComplete({ verdict, scores: calcQuizScores(form), answers: { ...form, q10 } })
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-500">9개 질문으로 내 창업 유형을 확인하세요</p>
      </div>

      {/* Q1~Q9 */}
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

          {(q.type === 'choice3' || q.type === 'choice4') && (
            <div className="flex flex-col gap-2 pl-9">
              {q.options.map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => set(q.key, opt)}
                  className={`w-full py-2.5 px-3 rounded-lg text-sm border-2 transition-all text-left ${
                    form[q.key] === opt
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="font-bold mr-1">{'①②③④'[i]}</span>{opt}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Q10: diff -2 ~ +2일 때만 표시 */}
      {needsQ10 && (
        <div className="bg-amber-50 rounded-xl border-2 border-amber-300 p-4 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
              style={{ background: '#D97706' }}
            >
              10
            </span>
            <div>
              <p className="text-xs text-amber-600 font-semibold mb-0.5">마지막으로 한 가지만 더 물어볼게요! 🤔</p>
              <p className="text-sm font-medium text-gray-800">본인이 생각하는 창업의 핵심 방향은 무엇인가요?</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pl-9">
            {Q10_OPTIONS.map(opt => (
              <button
                key={opt.val}
                onClick={() => setQ10(opt.val)}
                className={`w-full py-3 px-4 rounded-lg border-2 transition-all text-left ${
                  q10 === opt.val
                    ? 'border-amber-500 bg-amber-100'
                    : 'border-gray-200 bg-white hover:border-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{opt.emoji}</span>
                  <span className={`text-sm font-semibold ${q10 === opt.val ? 'text-amber-800' : 'text-gray-700'}`}>
                    {opt.label}
                  </span>
                </div>
                <p className={`text-xs mt-1 ml-7 leading-relaxed ${q10 === opt.val ? 'text-amber-700' : 'text-gray-400'}`}>
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 진행 안내 문구 */}
      {!q1to9Done && (
        <p className="text-center text-xs text-gray-400 pt-2">
          9개 질문에 모두 답하면 유형 결과가 표시됩니다
        </p>
      )}
      {needsQ10 && !q10 && (
        <p className="text-center text-xs text-amber-500 pt-2 font-medium">
          Q10에 답하면 최종 결과가 표시됩니다
        </p>
      )}

      {/* 결과 카드 */}
      {vInfo && (
        <div className="rounded-xl border-2 overflow-hidden shadow-sm" style={{ borderColor: vInfo.color }}>
          <div className="p-5 text-center" style={{ background: vInfo.bg }}>
            <div className="text-4xl mb-2">{vInfo.emoji}</div>
            <div className="text-2xl font-bold mb-2" style={{ color: vInfo.color }}>{vInfo.label}</div>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{vInfo.desc}</p>
          </div>

          {verdict !== '상담 후 결정' && (
            <div className="bg-white px-4 pt-4 pb-2">
              <div className="text-xs font-semibold text-gray-400 mb-2 text-center tracking-wide uppercase">포지셔닝 맵</div>
              <MatrixChart form={form} verdict={verdict} />
            </div>
          )}

          {verdict === '상담 후 결정' && (
            <div className="bg-white px-4 pt-4 pb-2">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 text-center leading-relaxed">
                💬 상담 신청 후 담당자가 배정되면 함께 최적의 창업 방향을 결정해드립니다.
              </div>
            </div>
          )}

          <div className="bg-white px-4 pb-4 pt-2">
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
    </div>
  )
}
