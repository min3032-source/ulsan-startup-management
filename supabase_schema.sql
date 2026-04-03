-- =============================================
-- 울산경제일자리진흥원 창업지원 통합관리 시스템
-- Supabase 데이터베이스 스키마 v2
-- =============================================
-- Supabase SQL Editor에 전체 붙여넣기 후 실행

-- =============================================
-- 1. 사용자 프로필 (auth.users 연동)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id        UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email     TEXT NOT NULL,
  name      TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('master', 'admin', 'manager', 'viewer')),
  department TEXT,
  phone     TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. 팀 설정 (단일 행 테이블)
-- =============================================
CREATE TABLE IF NOT EXISTS team_settings (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff      JSONB DEFAULT '["김민준","이서연","박지훈","최수아","정도윤","한채원","박현우"]',
  programs   JSONB DEFAULT '["예비창업패키지","초기창업패키지","창업도약패키지","로컬크리에이터","창업자금융자","R&D지원","상권분석컨설팅","투자연계","글로벌진출","IP·특허","세무·노무교육","SNS·마케팅","멘토링","공간·인큐베이터","기타"]',
  stages     JSONB DEFAULT '["아이디어 단계","준비 중","초기(1년 미만)","운영 중","성장기"]',
  methods    JSONB DEFAULT '["방문","전화","온라인","화상"]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 초기 설정 행 삽입 (없을 경우)
INSERT INTO team_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- =============================================
-- 3. 창업자 (접수 · 상담 대상)
-- =============================================
CREATE TABLE IF NOT EXISTS founders (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  biz        TEXT,
  region     TEXT,
  gender     TEXT CHECK (gender IN ('남', '여', '')),
  stage      TEXT,
  q1         TEXT DEFAULT '' CHECK (q1 IN ('yes','no','')),
  q2         TEXT DEFAULT '' CHECK (q2 IN ('yes','no','')),
  q3         TEXT DEFAULT '' CHECK (q3 IN ('yes','no','')),
  q4         TEXT DEFAULT '' CHECK (q4 IN ('yes','no','')),
  q5         TEXT DEFAULT '' CHECK (q5 IN ('yes','no','')),
  q6         TEXT DEFAULT '' CHECK (q6 IN ('yes','no','')),
  q7         TEXT DEFAULT '',
  verdict    TEXT DEFAULT '',
  date       DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 4. 상담일지
-- =============================================
CREATE TABLE IF NOT EXISTS consults (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_id    UUID REFERENCES founders(id) ON DELETE CASCADE,
  date          DATE DEFAULT CURRENT_DATE,
  staff         TEXT,
  method        TEXT,
  verdict       TEXT DEFAULT '',
  final_verdict TEXT DEFAULT '',
  request       TEXT DEFAULT '',
  content       TEXT DEFAULT '',
  programs      JSONB DEFAULT '[]',
  status        TEXT DEFAULT '완료'
                  CHECK (status IN ('완료','후속필요','진행중')),
  follow_up     TEXT DEFAULT '',
  next_date     DATE,
  memo          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 5. 전문가 DB
-- =============================================
CREATE TABLE IF NOT EXISTS experts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  org        TEXT DEFAULT '',
  role       TEXT DEFAULT '',
  field      TEXT DEFAULT '',
  sub_field  TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  career     TEXT DEFAULT '',
  avail      TEXT DEFAULT '',
  cost       TEXT DEFAULT '',
  status     TEXT DEFAULT '활동중'
               CHECK (status IN ('활동중','휴식중','종료')),
  memo       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 6. 전문가 상담·멘토링
-- =============================================
CREATE TABLE IF NOT EXISTS mentorings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id   UUID REFERENCES experts(id) ON DELETE SET NULL,
  target_type TEXT DEFAULT 'founder'
                CHECK (target_type IN ('founder','selected')),
  target_id   UUID,
  target_name TEXT DEFAULT '',
  program     TEXT DEFAULT '',
  staff       TEXT DEFAULT '',
  date        DATE DEFAULT CURRENT_DATE,
  time        TEXT DEFAULT '',
  duration    TEXT DEFAULT '1',
  method      TEXT DEFAULT '방문',
  status      TEXT DEFAULT '예정'
                CHECK (status IN ('예정','완료','취소')),
  cost        TEXT DEFAULT '0',
  content     TEXT DEFAULT '',
  outcome     TEXT DEFAULT '',
  next_date   DATE,
  memo        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 7. 지원사업 연계
-- =============================================
CREATE TABLE IF NOT EXISTS support_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_id  UUID REFERENCES founders(id) ON DELETE CASCADE,
  program     TEXT DEFAULT '',
  sub_program TEXT DEFAULT '',
  start_date  DATE,
  end_date    DATE,
  stage       TEXT DEFAULT '신청완료'
                CHECK (stage IN ('신청완료','서류심사','심사중','발표대기','수령완료','미선정')),
  result      TEXT DEFAULT '-',
  amount      TEXT DEFAULT '',
  staff       TEXT DEFAULT '',
  memo        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 8. 선정기업 관리
-- =============================================
CREATE TABLE IF NOT EXISTS selected_firms (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  ceo          TEXT DEFAULT '',
  biz_no       TEXT DEFAULT '',
  found_year   TEXT DEFAULT '',
  employees    TEXT DEFAULT '',
  biz_type     TEXT DEFAULT '',
  biz_item     TEXT DEFAULT '',
  sector       TEXT DEFAULT '',
  type         TEXT DEFAULT '테크'
                 CHECK (type IN ('테크','로컬','혼합')),
  region       TEXT DEFAULT '',
  gender       TEXT DEFAULT '',
  phone        TEXT DEFAULT '',
  email        TEXT DEFAULT '',
  program      TEXT DEFAULT '',
  staff        TEXT DEFAULT '',
  start_date   DATE,
  end_date     DATE,
  amount       TEXT DEFAULT '',
  status       TEXT DEFAULT '지원중'
                 CHECK (status IN ('지원중','완료','취소')),
  post_mgmt    TEXT DEFAULT '후속관리중',
  memo         TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 9. 선정기업 관리 메모
-- =============================================
CREATE TABLE IF NOT EXISTS selected_notes (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id   UUID REFERENCES selected_firms(id) ON DELETE CASCADE,
  staff     TEXT DEFAULT '',
  date      DATE DEFAULT CURRENT_DATE,
  type      TEXT DEFAULT '방문점검'
              CHECK (type IN ('방문점검','전화','이메일','화상','기타')),
  content   TEXT DEFAULT '',
  next_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 10. 창업기업 (법인 설립 현황)
-- =============================================
CREATE TABLE IF NOT EXISTS companies (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  founder_id  UUID REFERENCES founders(id) ON DELETE SET NULL,
  staff       TEXT DEFAULT '',
  biz         TEXT DEFAULT '',
  reg_date    DATE DEFAULT CURRENT_DATE,
  status      TEXT DEFAULT '초기운영'
                CHECK (status IN ('초기운영','운영중','성장중','스케일업','폐업')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 11. 기업 성장 지표
-- =============================================
CREATE TABLE IF NOT EXISTS growths (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_id  UUID REFERENCES founders(id) ON DELETE CASCADE,
  year        TEXT NOT NULL,
  revenue     TEXT DEFAULT '0',
  employees   TEXT DEFAULT '0',
  investment  TEXT DEFAULT '0',
  memo        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- updated_at 자동 업데이트 트리거
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_upd    BEFORE UPDATE ON profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_founders_upd    BEFORE UPDATE ON founders        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_consults_upd    BEFORE UPDATE ON consults        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_experts_upd     BEFORE UPDATE ON experts         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_mentorings_upd  BEFORE UPDATE ON mentorings      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_support_upd     BEFORE UPDATE ON support_items   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_sel_firms_upd   BEFORE UPDATE ON selected_firms  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_companies_upd   BEFORE UPDATE ON companies       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_growths_upd     BEFORE UPDATE ON growths         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 신규 회원가입 시 profiles 자동 생성
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'viewer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- RLS (Row Level Security) 정책
-- =============================================
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE founders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consults       ENABLE ROW LEVEL SECURITY;
ALTER TABLE experts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE growths        ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────
-- 로그인한 사용자는 전체 프로필 조회 가능 (사용자 관리 기능)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 본인 프로필은 직접 수정 가능
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- master/admin은 모든 프로필 수정 가능 (역할 변경 등)
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('master','admin'))
  );

-- ── team_settings ────────────────────────────
DROP POLICY IF EXISTS "settings_select" ON team_settings;
CREATE POLICY "settings_select" ON team_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "settings_update" ON team_settings;
CREATE POLICY "settings_update" ON team_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin'))
  );

-- ── 일반 데이터 테이블 (공통 패턴) ─────────────
-- 모든 로그인 사용자: SELECT 가능
-- manager 이상: INSERT / UPDATE 가능
-- admin 이상: DELETE 가능

-- founders
DROP POLICY IF EXISTS "founders_select" ON founders;
DROP POLICY IF EXISTS "founders_insert" ON founders;
DROP POLICY IF EXISTS "founders_update" ON founders;
DROP POLICY IF EXISTS "founders_delete" ON founders;
CREATE POLICY "founders_select" ON founders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "founders_insert" ON founders FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "founders_update" ON founders FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "founders_delete" ON founders FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin')));

-- consults
DROP POLICY IF EXISTS "consults_select" ON consults;
DROP POLICY IF EXISTS "consults_insert" ON consults;
DROP POLICY IF EXISTS "consults_update" ON consults;
DROP POLICY IF EXISTS "consults_delete" ON consults;
CREATE POLICY "consults_select" ON consults FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "consults_insert" ON consults FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "consults_update" ON consults FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "consults_delete" ON consults FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin')));

-- experts
DROP POLICY IF EXISTS "experts_select" ON experts;
DROP POLICY IF EXISTS "experts_insert" ON experts;
DROP POLICY IF EXISTS "experts_update" ON experts;
DROP POLICY IF EXISTS "experts_delete" ON experts;
CREATE POLICY "experts_select" ON experts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "experts_insert" ON experts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "experts_update" ON experts FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "experts_delete" ON experts FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin')));

-- mentorings
DROP POLICY IF EXISTS "mentorings_select" ON mentorings;
DROP POLICY IF EXISTS "mentorings_insert" ON mentorings;
DROP POLICY IF EXISTS "mentorings_update" ON mentorings;
DROP POLICY IF EXISTS "mentorings_delete" ON mentorings;
CREATE POLICY "mentorings_select" ON mentorings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "mentorings_insert" ON mentorings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "mentorings_update" ON mentorings FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "mentorings_delete" ON mentorings FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin')));

-- support_items
DROP POLICY IF EXISTS "support_select" ON support_items;
DROP POLICY IF EXISTS "support_insert" ON support_items;
DROP POLICY IF EXISTS "support_update" ON support_items;
DROP POLICY IF EXISTS "support_delete" ON support_items;
CREATE POLICY "support_select" ON support_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "support_insert" ON support_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "support_update" ON support_items FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "support_delete" ON support_items FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin')));

-- selected_firms
DROP POLICY IF EXISTS "sel_firms_select" ON selected_firms;
DROP POLICY IF EXISTS "sel_firms_insert" ON selected_firms;
DROP POLICY IF EXISTS "sel_firms_update" ON selected_firms;
DROP POLICY IF EXISTS "sel_firms_delete" ON selected_firms;
CREATE POLICY "sel_firms_select" ON selected_firms FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sel_firms_insert" ON selected_firms FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "sel_firms_update" ON selected_firms FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "sel_firms_delete" ON selected_firms FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin')));

-- selected_notes
DROP POLICY IF EXISTS "sel_notes_select" ON selected_notes;
DROP POLICY IF EXISTS "sel_notes_insert" ON selected_notes;
DROP POLICY IF EXISTS "sel_notes_update" ON selected_notes;
DROP POLICY IF EXISTS "sel_notes_delete" ON selected_notes;
CREATE POLICY "sel_notes_select" ON selected_notes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sel_notes_insert" ON selected_notes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "sel_notes_update" ON selected_notes FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "sel_notes_delete" ON selected_notes FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin')));

-- companies
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;
CREATE POLICY "companies_select" ON companies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "companies_insert" ON companies FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "companies_update" ON companies FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "companies_delete" ON companies FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin')));

-- growths
DROP POLICY IF EXISTS "growths_select" ON growths;
DROP POLICY IF EXISTS "growths_insert" ON growths;
DROP POLICY IF EXISTS "growths_update" ON growths;
DROP POLICY IF EXISTS "growths_delete" ON growths;
CREATE POLICY "growths_select" ON growths FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "growths_insert" ON growths FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "growths_update" ON growths FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin','manager')));
CREATE POLICY "growths_delete" ON growths FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('master','admin')));

-- =============================================
-- 마스터 계정 최초 role 변경 (가이드용 주석)
-- =============================================
-- 1. Supabase 대시보드 > Authentication > Users 에서 이메일로 첫 유저 생성
-- 2. 아래 SQL을 실행하여 마스터로 승격 (이메일 수정 후 실행)
-- UPDATE profiles SET role = 'master' WHERE email = 'your-email@example.com';
