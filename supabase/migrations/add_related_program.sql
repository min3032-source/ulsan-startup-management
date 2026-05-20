-- 교육 사업명 연결 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

ALTER TABLE education_programs
  ADD COLUMN IF NOT EXISTS related_program TEXT DEFAULT NULL;

ALTER TABLE education_applications
  ADD COLUMN IF NOT EXISTS related_program TEXT DEFAULT NULL;
