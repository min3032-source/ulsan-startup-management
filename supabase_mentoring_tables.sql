-- =====================================================
-- 멘토링 포털 Supabase 테이블 생성 SQL
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- 1. 멘토 배정 테이블
create table if not exists mentoring_assignments (
  id            uuid primary key default gen_random_uuid(),
  mentor_name   text not null,
  mentor_org    text,
  mentor_phone  text,
  company_name  text not null,
  founder_name  text,
  founder_phone text,
  item          text,
  password      text not null,
  created_at    timestamptz default now()
);

-- 2. 수행계획서 테이블
create table if not exists mentoring_plans (
  id                 uuid primary key default gen_random_uuid(),
  assignment_id      uuid references mentoring_assignments(id) on delete cascade,
  company_status     text,
  problem_diagnosis  text,
  goal               text,
  start_date         date,
  end_date           date,
  sessions           jsonb default '[]',
  submitted_at       timestamptz,
  updated_at         timestamptz default now()
);

-- 3. 수행일지 테이블
create table if not exists mentoring_logs (
  id                   uuid primary key default gen_random_uuid(),
  assignment_id        uuid references mentoring_assignments(id) on delete cascade,
  session_num          int not null,
  topic                text,
  date                 date,
  location_type        text default '대면',
  location             text,
  main_content         text,
  advice               text,
  mentee_understanding text,
  result               text,
  future_plan          text,
  photos               text[] default '{}',
  submitted_at         timestamptz,
  updated_at           timestamptz default now(),
  unique (assignment_id, session_num)
);

-- 4. 결과보고서 테이블
create table if not exists mentoring_reports (
  id                        uuid primary key default gen_random_uuid(),
  assignment_id             uuid references mentoring_assignments(id) on delete cascade,
  diagnosis_summary         text,
  goal                      text,
  steep                     jsonb default '{}',
  analysis_3c               jsonb default '{}',
  swot                      jsonb default '{}',
  strategic_direction       text,
  lean_canvas               jsonb default '{}',
  bm_strategy               text,
  quantitative_effect       jsonb default '{}',
  qualitative_effect        text,
  eval_founder_capability   text,
  eval_support_effectiveness text,
  eval_sales_increase       text,
  eval_employment_creation  text,
  submitted_at              timestamptz,
  updated_at                timestamptz default now()
);

-- =====================================================
-- RLS 정책 (Row Level Security)
-- 공개 접근 허용 (멘토는 비밀번호로 인증)
-- =====================================================

alter table mentoring_assignments enable row level security;
alter table mentoring_plans enable row level security;
alter table mentoring_logs enable row level security;
alter table mentoring_reports enable row level security;

-- anon 사용자 전체 접근 허용 (비밀번호 인증은 앱 레벨에서 처리)
create policy "allow_all_mentoring_assignments" on mentoring_assignments for all to anon using (true) with check (true);
create policy "allow_all_mentoring_plans"       on mentoring_plans       for all to anon using (true) with check (true);
create policy "allow_all_mentoring_logs"        on mentoring_logs        for all to anon using (true) with check (true);
create policy "allow_all_mentoring_reports"     on mentoring_reports     for all to anon using (true) with check (true);

-- =====================================================
-- Storage 버킷: mentoring-photos
-- Supabase Dashboard > Storage > New bucket
-- Name: mentoring-photos
-- Public: ON
-- =====================================================
-- 아래 SQL로 버킷 정책 설정 (버킷 생성 후 실행)
-- =====================================================

insert into storage.buckets (id, name, public)
values ('mentoring-photos', 'mentoring-photos', true)
on conflict (id) do nothing;

create policy "allow_mentoring_photo_upload"
  on storage.objects for insert to anon
  with check (bucket_id = 'mentoring-photos');

create policy "allow_mentoring_photo_read"
  on storage.objects for select to anon
  using (bucket_id = 'mentoring-photos');
