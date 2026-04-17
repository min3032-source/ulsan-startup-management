-- selected_firms: 설립연도(found_year) → 설립연월일(found_date)
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

-- 컬럼명 변경 (기존 컬럼명은 found_year)
ALTER TABLE selected_firms RENAME COLUMN found_year TO found_date;

-- 기존 데이터가 연도(예: '2020')만 있는 경우 그대로 보존됩니다.
-- 이후 입력은 YYYY-MM-DD 형식으로 저장됩니다.
