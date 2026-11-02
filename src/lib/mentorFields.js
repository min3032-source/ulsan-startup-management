// 멘토링 통합 시스템 공통 상수 (전문멘토 등록 신청서 양식 기준)

export const FIELD_CATEGORIES = [
  { cat: 'AI', subs: ['생성형 AI 업무활용', '업무자동화', '데이터 분석·활용', 'AI 솔루션·서비스 도입'] },
  { cat: '마케팅', subs: ['온라인·SNS마케팅', '브랜딩·디자인', '상세페이지·콘텐츠 제작', '광고·홍보'] },
  { cat: '투자', subs: ['투자유치·IR', '사업계획서 작성', '정책자금·보증 연계'] },
  { cat: '판로 및 수출', subs: ['온라인 판로(오픈마켓·라이브커머스)', '오프라인 유통·입점', '수출·해외진출', '공공조달'] },
  { cat: '경영', subs: ['경영전략·사업모델', '조직·인사·노무', '프랜차이즈·가맹', '업종전환·재기'] },
  { cat: '법률 및 회계', subs: ['법률·계약·분쟁', '지식재산(특허·상표 등)', '회계·세무'] },
  { cat: '기술', subs: ['제조(기계·에너지)', '제조(패션·주얼리)', 'IT(헬스케어)', 'IT(e-커머스)', 'IT(제조)', 'IT(서비스)', '교육·서비스', '서비스 일반'] },
]

export const ALL_SUBS = FIELD_CATEGORIES.flatMap(c => c.subs.map(sub => ({ cat: c.cat, sub })))

export const REGIONS = ['울산', '부산', '경남', '전국']
export const METHODS = ['대면', '비대면']
export const MENTEE_METHODS = ['모두', '대면', '비대면']
export const MENTEE_TYPES = ['예비창업자', '창업자', '소상공인', '중소기업', '기타']

export const GRADE_CRITERIA = {
  1: [
    '대학교의 조교수 및 대학의 부교수 이상',
    '기업·기관·단체의 임원, 중역',
    '변호사, 변리사, 공인회계사, 감정평가사로서 5년 이상 실무 경력자',
    '컨설턴트(석사학위 이상 소지자)',
    '박사학위를 소지한 정부출연·민간연구기관의 연구원으로서 4년 이상 실무 경력자',
    '기타 원장이 인정하는 자',
  ],
  2: [
    '대학교의 전임강사 및 대학의 조교수',
    '중소기업체 임원급',
    '기업·기관·단체의 부장급',
    '정부출연·연구기관의 연구원',
    '전문자격증을 가진 자로서 3년 이상 실무경력자',
    '기타 원장이 인정하는 자',
  ],
  3: ['해당분야 실무경력 3년 이상', '기타 원장이 인정하는 자'],
}

export const REQUIRED_DOCS = [
  { kind: 'education', label: '최종학력증명서', required: true },
  { kind: 'license', label: '자격증 사본(해당자)', required: false },
  { kind: 'career', label: '경력증명서(재직·경력 확인 가능서류)', required: true },
  { kind: 'record', label: '컨설팅·멘토링 실적 증빙(위촉장, 계약서, 확인서 등)', required: false },
  { kind: 'bankbook', label: '통장 사본', required: true },
]

export const DOC_STATUS_STYLE = {
  미작성: 'bg-gray-100 text-gray-500',
  작성중: 'bg-amber-50 text-amber-700',
  제출: 'bg-blue-50 text-blue-700',
  반려: 'bg-red-50 text-red-600',
  승인: 'bg-emerald-50 text-emerald-700',
}

// 수행 문서 양식 정의 (멘토 포털·관리자 화면 공통)
export const DOC_FORMS = {
  plan: {
    label: '수행계획서',
    fields: [
      { key: 'company_status', label: '기업 현황', type: 'textarea' },
      { key: 'problem_diagnosis', label: '문제 진단', type: 'textarea' },
      { key: 'goal', label: '멘토링 목표', type: 'textarea', required: true },
      { key: 'start_date', label: '시작일', type: 'date', half: true },
      { key: 'end_date', label: '종료일', type: 'date', half: true },
      { key: 'sessions', label: '회차별 계획', type: 'sessions' },
    ],
  },
  log: {
    label: '수행일지',
    fields: [
      { key: 'date', label: '일자', type: 'date', half: true, required: true },
      { key: 'time', label: '시간(예: 14:00~16:00)', type: 'text', half: true },
      { key: 'location_type', label: '방식', type: 'select', options: ['대면', '비대면'], half: true },
      { key: 'location', label: '장소(비대면은 플랫폼)', type: 'text', half: true },
      { key: 'topic', label: '주제', type: 'text', required: true },
      { key: 'main_content', label: '주요 내용', type: 'textarea', required: true },
      { key: 'advice', label: '자문·조언 내용', type: 'textarea' },
      { key: 'mentee_understanding', label: '멘티 이해도·반응', type: 'textarea' },
      { key: 'result', label: '성과', type: 'textarea' },
      { key: 'future_plan', label: '향후 계획', type: 'textarea' },
    ],
  },
  report: {
    label: '결과보고서',
    fields: [
      { key: 'diagnosis_summary', label: '진단 요약', type: 'textarea', required: true },
      { key: 'goal', label: '멘토링 목표 및 달성도', type: 'textarea' },
      { key: 'analysis', label: '환경 분석(STEEP·3C·SWOT 요약)', type: 'textarea' },
      { key: 'strategic_direction', label: '전략 방향·BM 전략', type: 'textarea' },
      { key: 'quantitative_effect', label: '정량 성과(전/후: 매출, 고용, 인증 등)', type: 'textarea' },
      { key: 'qualitative_effect', label: '정성 성과', type: 'textarea' },
      { key: 'follow_up', label: '후속 지원 필요사항', type: 'textarea' },
      { key: 'overall', label: '종합 의견', type: 'textarea', required: true },
    ],
  },
}

export function fieldsToLabel(fields = []) {
  return (fields || []).map(f => f.sub || f.cat).filter(Boolean).join(', ')
}

// 등급 제안: 신청서 경력·직위 텍스트 기반 (최종 판정은 담당자)
export function suggestGrade(text = '') {
  const t = String(text)
  if (/(부교수|정교수|임원|이사|상무|전무|부사장|대표이사|변호사|변리사|회계사|감정평가사|박사)/.test(t)) return 1
  if (/(조교수|전임강사|부장|연구원|기술사|세무사|노무사|행정사|경영지도사|기술지도사|석사)/.test(t)) return 2
  return 3
}

export function newFileName(original = '') {
  const ext = (original.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  const id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  return `${id}.${ext}`
}

export const ALLOWED_EXT = ['pdf', 'hwp', 'hwpx', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip']
export const MAX_FILE_MB = 20

export function checkFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_EXT.includes(ext)) return `허용되지 않는 파일 형식입니다 (${ALLOWED_EXT.join(', ')})`
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `파일은 ${MAX_FILE_MB}MB 이하만 올릴 수 있습니다`
  return null
}
