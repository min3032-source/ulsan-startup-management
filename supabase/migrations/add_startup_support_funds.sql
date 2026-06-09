CREATE TABLE IF NOT EXISTS startup_support_funds (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name          TEXT NOT NULL,
  company_name          TEXT,
  representative        TEXT,
  -- 기본정보
  employment_doc        TEXT,
  field                 TEXT,
  mentor                TEXT,
  grade                 TEXT,
  -- 사업비
  total_budget          NUMERIC DEFAULT 0,
  incentive             NUMERIC DEFAULT 0,
  -- 월별지원금 (4월~12월)
  pay_apr               NUMERIC DEFAULT 0,
  pay_may               NUMERIC DEFAULT 0,
  pay_jun               NUMERIC DEFAULT 0,
  pay_jul               NUMERIC DEFAULT 0,
  pay_aug               NUMERIC DEFAULT 0,
  pay_sep               NUMERIC DEFAULT 0,
  pay_oct               NUMERIC DEFAULT 0,
  pay_nov               NUMERIC DEFAULT 0,
  pay_dec               NUMERIC DEFAULT 0,
  extra_support         NUMERIC DEFAULT 0,
  -- 사업자정보
  business_type         TEXT,
  business_no           TEXT,
  business_start_date   DATE,
  business_category     TEXT,
  -- 성과
  long_term_employment  INTEGER DEFAULT 0,
  short_term_employment INTEGER DEFAULT 0,
  ip_rights             INTEGER DEFAULT 0,
  -- 매출 (총매출 + 5월~11월)
  total_revenue         NUMERIC DEFAULT 0,
  rev_may               NUMERIC DEFAULT 0,
  rev_jun               NUMERIC DEFAULT 0,
  rev_jul               NUMERIC DEFAULT 0,
  rev_aug               NUMERIC DEFAULT 0,
  rev_sep               NUMERIC DEFAULT 0,
  rev_oct               NUMERIC DEFAULT 0,
  rev_nov               NUMERIC DEFAULT 0,
  note                  TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
