-- monthly_payments, achievements JSONB 컬럼 추가 (기존 컬럼 유지)
ALTER TABLE startup_support_funds
  ADD COLUMN IF NOT EXISTS monthly_payments JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS achievements     JSONB DEFAULT NULL;
