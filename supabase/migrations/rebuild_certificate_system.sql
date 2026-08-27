-- 수료증 시스템 재구축
-- 배경: issueCertificate()에 도달 불가능한 return문이 섞여 있어 수료증 발급 버튼이
--       실제로는 아무것도 저장하지 않았음. 이번 작업으로:
--         1) 코드 버그를 고쳐 배포했고,
--         2) 기존 '수료' 상태 260건의 수료증 번호를 REST API로 직접 백필했습니다
--            (제2026-03-001호 ~ 제2026-03-260호, 프로그램 진행일 → 신청일 순).
--       단, certificates 테이블에 UNIQUE 제약이 없어 동시에 관리자 화면에서 중복 클릭이
--       발생해 여러 건 겹쳐 발급됐고, 그때마다 수동으로 정리했습니다.
--       이 마이그레이션은 그 사고를 재발 방지하기 위해 "이미 채워진 실데이터를 보존한 채"
--       필요한 제약조건만 추가합니다. (DROP TABLE 하지 않습니다 — 실데이터 손실 방지)
--
-- 실행 방법: Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 실행하세요.
--           (이 저장소에는 서비스 롤 키/DB 연결 정보가 없어 CLI로 자동 적용할 수 없습니다.
--            중복 발급을 막는 UNIQUE 제약이 아직 없는 상태이니 최대한 빨리 실행해 주세요.)

-- =====================================================
-- 1. certificates 테이블에 중복 발급 방지 제약 추가 (기존 데이터 유지)
-- =====================================================
alter table certificates
  add constraint certificates_application_id_key unique (application_id);

alter table certificates
  add constraint certificates_certificate_number_key unique (certificate_number);

alter table certificates enable row level security;

drop policy if exists "anon select certificates" on certificates;
create policy "anon select certificates" on certificates for select using (true);

drop policy if exists "anon insert certificates" on certificates;
create policy "anon insert certificates" on certificates for insert with check (true);

drop policy if exists "anon update certificates" on certificates;
create policy "anon update certificates" on certificates for update using (true);

drop policy if exists "anon delete certificates" on certificates;
create policy "anon delete certificates" on certificates for delete using (true);

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
-- 3. 이미 발급된 certificates → education_applications 동기화
--    (번호는 이미 REST로 백필됐으므로 새로 생성하지 않고 그대로 복사만 한다)
-- =====================================================
update education_applications ea
set certificate_number = c.certificate_number
from certificates c
where c.application_id = ea.id
  and ea.certificate_number is distinct from c.certificate_number;
