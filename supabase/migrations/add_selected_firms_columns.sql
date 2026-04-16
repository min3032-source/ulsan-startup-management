-- 선정기업 관리 개선: 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

-- selected_firms: item, support_programs 컬럼
ALTER TABLE selected_firms
  ADD COLUMN IF NOT EXISTS item text,
  ADD COLUMN IF NOT EXISTS support_programs jsonb DEFAULT '[]';

-- consults: firm_id 컬럼 (선정기업 직접 연결)
ALTER TABLE consults
  ADD COLUMN IF NOT EXISTS firm_id uuid REFERENCES selected_firms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS consults_firm_id_idx ON consults(firm_id);
