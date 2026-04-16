-- 기업 성장지표 테이블
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS growth_metrics (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id       uuid REFERENCES selected_firms(id) ON DELETE CASCADE,
  year          integer NOT NULL,
  period_type   text CHECK (period_type IN ('연도', '반기', '분기')),
  period_label  text,
  revenue       bigint,
  employees     integer,
  investment    bigint,
  export_amount bigint,
  patent_count  integer,
  memo          text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_metrics_firm_id_idx ON growth_metrics(firm_id);
CREATE INDEX IF NOT EXISTS growth_metrics_year_idx    ON growth_metrics(year);
