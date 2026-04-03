// ────────────────────────────────────────────────────────
// 울산경제일자리진흥원 창업지원 통합관리 시스템 — 공통 상수
// ────────────────────────────────────────────────────────

export const ULSAN_REGIONS = [
  '울산 남구', '울산 중구', '울산 북구', '울산 동구', '울산 울주군', '기타(타지역)'
]

export const EXPERT_FIELDS = [
  '창업', '기술·R&D', '경영·마케팅', '법무·특허', '재무·투자',
  '인사·노무', '세무·회계', '수출·글로벌', '디자인·UX', '기타'
]

export const DEFAULT_SETTINGS = {
  staff: ['김민준', '이서연', '박지훈', '최수아', '정도윤', '한채원', '박현우'],
  programs: [
    '예비창업패키지', '초기창업패키지', '창업도약패키지', '로컬크리에이터',
    '창업자금융자', 'R&D지원', '상권분석컨설팅', '투자연계', '글로벌진출',
    'IP·특허', '세무·노무교육', 'SNS·마케팅', '멘토링', '공간·인큐베이터', '기타'
  ],
  stages: ['아이디어 단계', '준비 중', '초기(1년 미만)', '운영 중', '성장기'],
  methods: ['방문', '전화', '온라인', '화상'],
}

export const SUPPORT_STAGES = ['신청완료', '서류심사', '심사중', '발표대기', '수령완료', '미선정']

export const MENTORING_PROGRAMS = [
  '기술 자문', '마케팅 멘토링', '법무 자문', '투자 유치 자문',
  '인사·노무 자문', '세무·회계 자문', '수출 자문', '경영 전략', '기타'
]

export const COMPANY_STATUSES = ['초기운영', '운영중', '성장중', '스케일업', '폐업']

export const NOTE_TYPES = ['방문점검', '전화', '이메일', '화상', '기타']

// Q1~Q7 질문 텍스트
export const Q_LABELS = {
  q1: '소프트웨어·앱·플랫폼을 없애면 사업 자체가 사라지나요?',
  q2: '고객이 2배로 늘어도 추가 인력·공간이 거의 필요 없나요?',
  q3: '지금 사업을 다른 도시에서도 추가 비용 없이 동일하게 할 수 있나요?',
  q4: '대표님이 한 달 자리를 비워도 매출이 계속 발생하나요?',
  q5: '사업의 가장 중요한 자산이 코드·데이터·플랫폼인가요?',
  q6: '주요 수익이 소프트웨어 이용료·구독료·플랫폼 수수료로 들어오나요? (가중치 0.5 추가)',
  q7: '3년 후 사업의 핵심 방향',
}

// calcVerdict: returns 판정 string
export function calcVerdict(q1, q2, q3, q4, q5, q6, q7) {
  const ans = [q1, q2, q3, q4, q5] // q1~q5
  const yesCount = ans.filter(a => a === 'yes').length
  const noCount  = ans.filter(a => a === 'no').length
  const q6Bonus  = q6 === 'yes' ? 0.5 : 0

  if (yesCount + q6Bonus >= 5) return '테크 창업'
  if (noCount  + q6Bonus >= 5) return '로컬 창업'
  if (yesCount + q6Bonus >= 3.5) {
    if (q7 === 'tech') return '테크/로컬 창업 (혼합)'
    return '혼합형 창업'
  }
  if (noCount  + q6Bonus >= 3.5) return '로컬 창업'
  return '혼합형 창업'
}

// ── 뱃지 색상 매핑 ────────────────────────────────────

export function getVerdictBadgeClass(verdict) {
  if (!verdict) return 'bg-gray-100 text-gray-500'
  if (verdict.includes('테크')) return 'bg-blue-100 text-blue-700'
  if (verdict.includes('로컬')) return 'bg-green-100 text-green-700'
  if (verdict.includes('혼합')) return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-500'
}

export function getStatusBadgeClass(status) {
  const map = {
    '완료': 'bg-green-100 text-green-700',
    '선정': 'bg-green-100 text-green-700',
    '후속필요': 'bg-orange-100 text-orange-700',
    '후속관리중': 'bg-orange-100 text-orange-700',
    '진행중': 'bg-blue-100 text-blue-700',
    '지원중': 'bg-blue-100 text-blue-700',
    '예정': 'bg-blue-100 text-blue-700',
    '신청완료': 'bg-blue-100 text-blue-700',
    '서류심사': 'bg-teal-100 text-teal-700',
    '심사중': 'bg-amber-100 text-amber-700',
    '발표대기': 'bg-purple-100 text-purple-700',
    '수령완료': 'bg-green-100 text-green-700',
    '미선정': 'bg-red-100 text-red-700',
    '취소': 'bg-gray-100 text-gray-500',
    '활동중': 'bg-green-100 text-green-700',
    '휴식중': 'bg-amber-100 text-amber-700',
    '종료': 'bg-gray-100 text-gray-500',
    '성장추적중': 'bg-teal-100 text-teal-700',
    '초기운영': 'bg-amber-100 text-amber-700',
    '운영중': 'bg-green-100 text-green-700',
    '성장중': 'bg-blue-100 text-blue-700',
    '스케일업': 'bg-teal-100 text-teal-700',
    '폐업': 'bg-red-100 text-red-700',
  }
  return map[status] || 'bg-gray-100 text-gray-500'
}

export function getExpertFieldBadgeClass(field) {
  const map = {
    '기술·R&D': 'bg-blue-100 text-blue-700',
    '경영·마케팅': 'bg-teal-100 text-teal-700',
    '법무·특허': 'bg-purple-100 text-purple-700',
    '재무·투자': 'bg-green-100 text-green-700',
    '인사·노무': 'bg-amber-100 text-amber-700',
    '세무·회계': 'bg-amber-100 text-amber-700',
    '수출·글로벌': 'bg-teal-100 text-teal-700',
    '디자인·UX': 'bg-purple-100 text-purple-700',
  }
  return map[field] || 'bg-gray-100 text-gray-500'
}

// 아바타 이니셜 색상
export function getAvatarColor(name) {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-amber-500',
    'bg-teal-500', 'bg-purple-500', 'bg-rose-500',
  ]
  if (!name) return colors[0]
  return colors[name.charCodeAt(0) % colors.length]
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function supportDuration(start, end) {
  if (!start) return '-'
  const s = new Date(start)
  const e = end ? new Date(end) : new Date()
  const months = Math.round((e - s) / (1000 * 60 * 60 * 24 * 30))
  if (months < 1) return '1개월 미만'
  if (months < 12) return `${months}개월`
  return `${Math.floor(months / 12)}년 ${months % 12 ? months % 12 + '개월' : ''}`
}
