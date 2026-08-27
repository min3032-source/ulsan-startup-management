// 혁신 소상공인 AI활용지원사업 공식 사이트(aiplusinnovation.kr)의 멘토기업 목록을
// mentor_companies 테이블에 동기화한다.
//
// 소스 데이터(aiplusinnovation.kr/assets/mentors/mentor-companies.json)에는
// 대표자·연락처·이메일 정보가 없다. 그 컬럼들(ceo_name/phone/email)은
// 멘토기업 포털(company.ubpi.or.kr) 로그인 인증에 쓰이는 값이라 관리자가 수기로
// 입력해둔 값을 절대 덮어쓰지 않는다 — 이 스크립트는 company_name/field/address/intro만 갱신한다.
//
// 필요 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (anon key로는 mentor_companies 쓰기가 RLS에 막혀 있어 service role key가 필요하다)

import { createClient } from '@supabase/supabase-js'

const SOURCE_URL = 'https://aiplusinnovation.kr/assets/mentors/mentor-companies.json'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`환경변수 ${name}가 설정되어 있지 않습니다.`)
    process.exit(1)
  }
  return v
}

function toSyncRow(company) {
  const field = (company.fieldTags?.length ? company.fieldTags.join('·') : company.field) || null
  const address = company.regionGroup || company.region || null
  const intro = company.intro || company.summary || null
  const name = (company.name || '').trim()
  return { company_name: name, field, address, intro }
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  console.log(`소스 조회: ${SOURCE_URL}`)
  const res = await fetch(SOURCE_URL)
  if (!res.ok) {
    throw new Error(`소스 데이터 조회 실패: HTTP ${res.status}`)
  }
  const payload = await res.json()
  const companies = payload.companies || []
  console.log(`소스 기업 수: ${companies.length}`)

  const rows = companies
    .map(toSyncRow)
    .filter(r => r.company_name)

  const { data: existing, error: fetchErr } = await supabase
    .from('mentor_companies')
    .select('id, company_name')
  if (fetchErr) throw fetchErr

  const existingByName = new Map(existing.map(r => [r.company_name, r.id]))

  let inserted = 0
  let updated = 0
  const errors = []

  for (const row of rows) {
    const existingId = existingByName.get(row.company_name)
    if (existingId) {
      const { error } = await supabase
        .from('mentor_companies')
        .update({ field: row.field, address: row.address, intro: row.intro })
        .eq('id', existingId)
      if (error) errors.push({ company: row.company_name, error: error.message })
      else updated++
    } else {
      const { error } = await supabase
        .from('mentor_companies')
        .insert({ ...row, status: '활동중' })
      if (error) errors.push({ company: row.company_name, error: error.message })
      else inserted++
    }
  }

  console.log(`동기화 완료 — 신규 ${inserted}건, 업데이트 ${updated}건, 실패 ${errors.length}건`)
  if (errors.length) {
    console.error('실패 목록:', JSON.stringify(errors, null, 2))
    process.exit(1)
  }
}

main().catch(err => {
  console.error('동기화 중 오류 발생:', err)
  process.exit(1)
})
