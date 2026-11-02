// 멘토-멘티 자동매칭 점수 계산 (규칙 기반, 근거 표시 가능)
// 순수 함수로만 구성 — 화면과 테스트에서 함께 사용

export const WEIGHTS = {
  subMatch: 40,          // 필요 세부분야 = 멘토 세부분야
  priorityBonus: 10,     // 그 세부분야가 멘토 주력분야
  catMatch: 20,          // 대분류만 일치
  keyword: 5,            // 키워드 1개당
  keywordMax: 10,
  region: 15,            // 지역 일치 또는 멘토 '전국'
  method: 10,            // 방식 호환
  pref: { 1: 25, 2: 15, 3: 10 }, // 멘티 희망 멘토 순위
  loadPenalty: 5,        // 진행 중 매칭 1건당 감점
}

const norm = s => String(s || '').trim().toLowerCase()

function regionOf(text) {
  const t = String(text || '')
  if (/울산/.test(t)) return '울산'
  if (/부산/.test(t)) return '부산'
  if (/(경남|경상남도|창원|김해|양산|진주|거제|통영|사천|밀양)/.test(t)) return '경남'
  return ''
}

/**
 * @param {object} mentor  mt_mentors row (+ activeCount)
 * @param {object} mentee  mt_mentees row
 * @param {object} opts    { minGrade, conflicts:Set("mentorId|menteeId") }
 * @returns {{ score:number, excluded:boolean, reasons:string[] }}
 */
export function scorePair(mentor, mentee, opts = {}) {
  const reasons = []
  const exclude = r => ({ score: 0, excluded: true, reasons: [r] })

  if (mentor.status && mentor.status !== '활동중') return exclude(`멘토 상태: ${mentor.status}`)
  if (opts.conflicts?.has(`${mentor.id}|${mentee.id}`)) return exclude('이해관계 신고 대상')
  if (opts.minGrade && (!mentor.grade || mentor.grade > opts.minGrade)) {
    return exclude(`등급 미달(사업 기준 ${opts.minGrade}급 이상)`)
  }
  const active = mentor.activeCount || 0
  const cap = mentor.max_active_matches ?? 5
  if (active >= cap) return exclude(`멘토 정원 초과(${active}/${cap})`)

  const mMethods = mentor.methods || []
  const want = mentee.method || '모두'
  if (want !== '모두' && mMethods.length > 0 && !mMethods.includes(want)) {
    return exclude(`방식 불일치(멘티 ${want})`)
  }

  let score = 0

  // 1) 분야
  const mFields = mentor.fields || []
  const mSubs = new Set(mFields.filter(f => f.sub).map(f => f.sub))
  const mCats = new Set(mFields.map(f => f.cat))
  const prio = mentor.priority_fields || []
  let fieldScore = 0
  for (const need of mentee.need_fields || []) {
    let s = 0
    if (need.sub && mSubs.has(need.sub)) {
      s = WEIGHTS.subMatch + (prio.includes(need.sub) ? WEIGHTS.priorityBonus : 0)
      reasons.push(`분야 일치: ${need.sub}${prio.includes(need.sub) ? ' (주력)' : ''}`)
    } else if (mCats.has(need.cat)) {
      s = WEIGHTS.catMatch
      reasons.push(`대분류 일치: ${need.cat}`)
    }
    fieldScore = Math.max(fieldScore, s)
  }
  score += fieldScore

  // 2) 키워드 (멘티 키워드·아이템 ↔ 멘토 키워드·소개)
  const mText = norm([...(mentor.keywords || []), mentor.intro, mentor.legacy_field_text, mentor.field_etc].join(' '))
  const kws = [...(mentee.need_keywords || []), ...String(mentee.item || '').split(/[\s,·/]+/)]
    .map(norm).filter(k => k.length >= 2)
  const hits = [...new Set(kws.filter(k => mText.includes(k)))]
  if (hits.length) {
    const s = Math.min(WEIGHTS.keywordMax, hits.length * WEIGHTS.keyword)
    score += s
    reasons.push(`키워드: ${hits.slice(0, 3).join(', ')}`)
  }

  // 3) 지역
  const mRegions = mentor.regions || []
  const menteeRegion = regionOf(mentee.region) || regionOf(mentee.company_name)
  if (mRegions.includes('전국')) {
    score += WEIGHTS.region; reasons.push('활동지역: 전국')
  } else if (menteeRegion && mRegions.includes(menteeRegion)) {
    score += WEIGHTS.region; reasons.push(`활동지역: ${menteeRegion}`)
  }

  // 4) 방식
  if (want === '모두' || mMethods.length === 0 || mMethods.includes(want)) {
    score += WEIGHTS.method
  }

  // 5) 멘티 희망 멘토
  const prefIdx = (mentee.preferred_mentor_ids || []).indexOf(mentor.id)
  if (prefIdx >= 0 && prefIdx < 3) {
    score += WEIGHTS.pref[prefIdx + 1]
    reasons.push(`멘티 희망 ${prefIdx + 1}순위`)
  }

  // 분야 관련성 없음: 필요분야가 입력된 멘티인데 분야·키워드·희망멘토 어느 것도 맞지 않으면 제외
  if ((mentee.need_fields || []).length && fieldScore === 0 && !hits.length && prefIdx < 0) {
    return exclude('분야 불일치')
  }

  // 6) 업무량
  if (active > 0) {
    score -= active * WEIGHTS.loadPenalty
    reasons.push(`진행 중 ${active}건(-${active * WEIGHTS.loadPenalty})`)
  }

  return { score, excluded: false, reasons }
}

/** 멘티 1명에 대한 추천 목록 (점수 내림차순) */
export function recommend(mentee, mentors, opts = {}, top = 3) {
  return mentors
    .map(m => ({ mentor: m, ...scorePair(m, mentee, opts) }))
    .filter(r => !r.excluded)
    .sort((a, b) => b.score - a.score || (a.mentor.activeCount || 0) - (b.mentor.activeCount || 0))
    .slice(0, top)
}

/**
 * 일괄 자동배정: 전체 (멘티,멘토) 쌍을 점수순으로 정렬 후
 * 멘티 1명당 1멘토, 멘토 정원 지키며 배정 (탐욕 알고리즘)
 */
export function autoAssign(mentees, mentors, opts = {}, minScore = 1) {
  const load = new Map(mentors.map(m => [m.id, m.activeCount || 0]))
  const pairs = []
  for (const e of mentees) {
    for (const m of mentors) {
      const r = scorePair({ ...m, activeCount: 0 }, e, opts) // 정원은 아래에서 직접 관리
      if (!r.excluded && r.score >= minScore) pairs.push({ mentee: e, mentor: m, ...r })
    }
  }
  pairs.sort((a, b) => b.score - a.score)
  const done = new Set()
  const result = []
  for (const p of pairs) {
    if (done.has(p.mentee.id)) continue
    const cap = p.mentor.max_active_matches ?? 5
    const cur = load.get(p.mentor.id) || 0
    if (cur >= cap) continue
    // 업무량 감점 반영한 최종 점수
    const penalty = cur * WEIGHTS.loadPenalty
    result.push({ ...p, score: p.score - penalty, reasons: penalty ? [...p.reasons, `진행 중 ${cur}건(-${penalty})`] : p.reasons })
    load.set(p.mentor.id, cur + 1)
    done.add(p.mentee.id)
  }
  const unassigned = mentees.filter(e => !done.has(e.id))
  return { result, unassigned }
}
