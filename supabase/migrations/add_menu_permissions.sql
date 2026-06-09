-- profiles 테이블에 menu_permissions 컬럼 추가
-- null: 제한 없음(전체 허용), 배열: 허용된 메뉴 키 목록
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS menu_permissions JSONB DEFAULT NULL;
