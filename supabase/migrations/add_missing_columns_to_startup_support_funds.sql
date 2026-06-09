-- 누락된 컬럼 추가 (기존 데이터 영향 없음)
ALTER TABLE startup_support_funds
  ADD COLUMN IF NOT EXISTS business_no           TEXT,
  ADD COLUMN IF NOT EXISTS business_start_date   DATE,
  ADD COLUMN IF NOT EXISTS business_category     TEXT,
  ADD COLUMN IF NOT EXISTS monthly_payments      JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS achievements          JSONB DEFAULT NULL;
