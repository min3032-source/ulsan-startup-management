-- profiles 테이블에 직책(position) 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS position TEXT DEFAULT NULL;
