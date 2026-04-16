-- 선정기업 관리 개선: item, support_programs 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

ALTER TABLE selected_firms
  ADD COLUMN IF NOT EXISTS item text,
  ADD COLUMN IF NOT EXISTS support_programs jsonb DEFAULT '[]';
