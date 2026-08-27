-- 수료증 시스템 재구축
-- 배경: issueCertificate()에 도달 불가능한 return문이 섞여 있어 수료증 발급 버튼이
--       실제로는 아무것도 저장하지 않았음(certificates 테이블이 비어 있는 상태로 확인됨).
--       이 마이그레이션은 certificates 테이블을 올바른 제약조건으로 재생성하고,
--       education_applications에 certificate_number 컬럼을 추가한 뒤,
--       이미 '수료' 처리된 신청 건들의 수료증 번호를 일괄 발급(복구)한다.
--
-- 실행 방법: Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 실행하세요.
--           (이 저장소에는 서비스 롤 키/DB 연결 정보가 없어 CLI로 자동 적용할 수 없습니다.)

-- =====================================================
-- 1. certificates 테이블 재생성
-- =====================================================
drop table if exists certificates cascade;

create table certificates (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references education_applications(id) on delete cascade,
  certificate_number text not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint certificates_application_id_key unique (application_id),   -- 신청 건당 1장 (중복 발급 방지)
  constraint certificates_certificate_number_key unique (certificate_number)
);

create index certificates_application_id_idx on certificates (application_id);

alter table certificates enable row level security;

-- 이 앱은 자체 로그인(비밀번호 대조) 방식이라 Supabase Auth를 쓰지 않고
-- anon 키로 직접 CRUD한다. education_applications 등 기존 테이블과 동일한 방식으로 맞춘다.
create policy "anon select certificates"
  on certificates for select
  using (true);

create policy "anon insert certificates"
  on certificates for insert
  with check (true);

create policy "anon update certificates"
  on certificates for update
  using (true);

create policy "anon delete certificates"
  on certificates for delete
  using (true);

-- =====================================================
-- 2. education_applications.certificate_number 컬럼 추가
--    (certificates 테이블과 별도로, 목록 화면에서 join 없이 바로 조회하기 위한 비정규화 컬럼)
-- =====================================================
alter table education_applications
  add column if not exists certificate_number text;

create unique index if not exists ux_education_applications_certificate_number
  on education_applications (certificate_number)
  where certificate_number is not null;

-- =====================================================
-- 3. 기존 수료자 수료증 번호 일괄 발급/복구
--    형식: 제{연도}-03-{순번 3자리}호  (03 = 창업지원부 고정 부서코드)
--    순번은 교육 진행일(program.start_date) → 신청일(applied_at) 순으로 부여한다.
--    * 실행 시점 기준 status='수료' 인 건만 대상이며, 연도는 각 프로그램의 시작연도를 사용한다.
-- =====================================================
with target as (
  select
    ea.id as application_id,
    extract(year from ep.start_date)::int as cert_year,
    row_number() over (
      partition by extract(year from ep.start_date)
      order by ep.start_date, ea.applied_at, ea.id
    ) as seq
  from education_applications ea
  join education_programs ep on ep.id = ea.program_id
  where ea.status = '수료'
),
numbered as (
  select
    application_id,
    '제' || cert_year || '-03-' || lpad(seq::text, 3, '0') || '호' as certificate_number
  from target
),
inserted as (
  insert into certificates (application_id, certificate_number, issued_at)
  select application_id, certificate_number, now()
  from numbered
  on conflict (application_id) do nothing
  returning application_id, certificate_number
)
update education_applications ea
set certificate_number = i.certificate_number
from inserted i
where i.application_id = ea.id;
