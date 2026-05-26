-- education_programs 테이블에 강사 정보 컬럼 추가
ALTER TABLE education_programs
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS instructor_organization TEXT;
