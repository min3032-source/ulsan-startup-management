-- 혁신 소상공인 AI활용지원사업 - 멘토매칭 시스템
-- mentor_companies / small_businesses / mentor_preferences / company_preferences / matchings / mentoring_records

-- 1. 멘토기업 DB (114개 예정)
create table if not exists mentor_companies (
  id           uuid primary key default gen_random_uuid(),
  company_name text not null,
  ceo_name     text,
  phone        text,
  email        text,
  field        text,           -- 업종/분야
  address      text,
  intro        text,           -- 기업소개 · 멘토링 제공 가능분야
  status       text not null default '활동중' check (status in ('활동중','휴식중','종료')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_mentor_companies_status on mentor_companies(status);

-- 2. 소상공인 신청 (88개 예정)
create table if not exists small_businesses (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  company_name   text not null,
  phone          text not null,
  email          text,
  item           text,          -- 업종 · 아이템
  memo           text,
  status         text not null default '신청완료' check (status in ('신청완료','매칭완료')),
  privacy_agreed boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_small_businesses_status on small_businesses(status);

-- 3. 소상공인의 멘토기업 1,2,3순위 선택
create table if not exists mentor_preferences (
  id                 uuid primary key default gen_random_uuid(),
  small_business_id  uuid not null references small_businesses(id) on delete cascade,
  mentor_company_id  uuid not null references mentor_companies(id) on delete cascade,
  priority           int not null check (priority in (1,2,3)),
  created_at         timestamptz not null default now(),
  unique (small_business_id, priority),
  unique (small_business_id, mentor_company_id)
);

create index if not exists idx_mentor_preferences_company on mentor_preferences(mentor_company_id);

-- 4. 멘토기업의 관심 소상공인 선택
create table if not exists company_preferences (
  id                 uuid primary key default gen_random_uuid(),
  mentor_company_id  uuid not null references mentor_companies(id) on delete cascade,
  small_business_id  uuid not null references small_businesses(id) on delete cascade,
  created_at         timestamptz not null default now(),
  unique (mentor_company_id, small_business_id)
);

create index if not exists idx_company_preferences_business on company_preferences(small_business_id);

-- 5. 최종 매칭 결과
create table if not exists matchings (
  id                  uuid primary key default gen_random_uuid(),
  small_business_id   uuid not null references small_businesses(id) on delete cascade,
  mentor_company_id   uuid not null references mentor_companies(id) on delete cascade,
  matched_priority    int,
  status              text not null default '매칭완료' check (status in ('매칭완료','협약완료','멘토링중','멘토링완료')),
  agreement_signed    boolean not null default false,
  agreement_date      date,
  agreement_file_url  text,
  created_at          timestamptz not null default now(),
  unique (small_business_id)
);

create index if not exists idx_matchings_company on matchings(mentor_company_id);

-- 6. 멘토링 수행 기록 (수행계획서 · 수행일지 · 결과보고서)
create table if not exists mentoring_records (
  id                  uuid primary key default gen_random_uuid(),
  matching_id         uuid not null unique references matchings(id) on delete cascade,
  plan_content        text,
  plan_submitted_at   timestamptz,
  logs                jsonb not null default '[]',
  report_content      text,
  report_submitted_at timestamptz,
  updated_at          timestamptz not null default now()
);

create or replace function set_mentoring_records_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_mentoring_records_updated_at on mentoring_records;
create trigger trg_mentoring_records_updated_at
  before update on mentoring_records
  for each row execute function set_mentoring_records_updated_at();

-- =====================================================
-- RLS 정책
-- 소상공인 신청 페이지 · 멘토기업 조회 페이지는 비로그인 공개 접근이므로
-- anon 역할에 필요한 범위만 허용하고, 관리자 대시보드 작업은 authenticated로 제한한다.
-- =====================================================

alter table mentor_companies   enable row level security;
alter table small_businesses   enable row level security;
alter table mentor_preferences enable row level security;
alter table company_preferences enable row level security;
alter table matchings           enable row level security;
alter table mentoring_records   enable row level security;

-- mentor_companies: 공개 열람(신청 페이지 목록·조회페이지 본인확인), 관리는 로그인 사용자만
create policy "anon read mentor_companies" on mentor_companies for select to anon using (true);
create policy "authenticated manage mentor_companies" on mentor_companies for all to authenticated using (true) with check (true);

-- small_businesses: 공개 신청(insert) + 공개 열람(조회페이지 목록), 관리는 로그인 사용자만
create policy "anon insert small_businesses" on small_businesses for insert to anon with check (true);
create policy "anon read small_businesses" on small_businesses for select to anon using (true);
create policy "authenticated manage small_businesses" on small_businesses for all to authenticated using (true) with check (true);

-- mentor_preferences: 신청 시 공개 insert + 공개 열람(조회페이지), 관리는 로그인 사용자만
create policy "anon insert mentor_preferences" on mentor_preferences for insert to anon with check (true);
create policy "anon read mentor_preferences" on mentor_preferences for select to anon using (true);
create policy "authenticated manage mentor_preferences" on mentor_preferences for all to authenticated using (true) with check (true);

-- company_preferences: 멘토기업 조회페이지에서 공개 insert/delete(관심 토글) + 공개 열람
create policy "anon insert company_preferences" on company_preferences for insert to anon with check (true);
create policy "anon read company_preferences" on company_preferences for select to anon using (true);
create policy "anon delete company_preferences" on company_preferences for delete to anon using (true);
create policy "authenticated manage company_preferences" on company_preferences for all to authenticated using (true) with check (true);

-- matchings: 공개 열람(매칭 상태 확인) 허용, 매칭 실행·수정은 로그인 사용자만
create policy "anon read matchings" on matchings for select to anon using (true);
create policy "authenticated manage matchings" on matchings for all to authenticated using (true) with check (true);

-- mentoring_records: 관리자 대시보드에서만 사용 — 로그인 사용자 전용
create policy "authenticated manage mentoring_records" on mentoring_records for all to authenticated using (true) with check (true);
