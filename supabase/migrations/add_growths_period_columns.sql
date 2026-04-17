-- growths 테이블에 기간유형/라벨/수출액/특허 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

ALTER TABLE growths
  ADD COLUMN IF NOT EXISTS period_type   text CHECK (period_type IN ('연도', '반기', '분기')) DEFAULT '연도',
  ADD COLUMN IF NOT EXISTS period_label  text,
  ADD COLUMN IF NOT EXISTS export_amount bigint,
  ADD COLUMN IF NOT EXISTS patent_count  integer;

-- 기존 데이터 period_label 채우기 (year 값으로 "XXXX년" 형식)
UPDATE growths SET period_label = year || '년' WHERE period_label IS NULL;
