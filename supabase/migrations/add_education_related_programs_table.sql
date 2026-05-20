-- 교육 사업명 마스터 테이블 생성
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS education_related_programs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
