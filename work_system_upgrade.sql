-- =============================================
-- 업무분장 시스템 1단계 업그레이드
-- 팀원 - 팀장 - 부장 - 원장 구조
-- =============================================

-- work_assignments 테이블 (업무 배정)
CREATE TABLE IF NOT EXISTS work_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_id bigint REFERENCES work_items(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  is_co_worker boolean DEFAULT false,
  period text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE work_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_assignments_all" ON work_assignments FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 직원 강점 태그
CREATE TABLE IF NOT EXISTS work_skills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  skill text NOT NULL,
  level int DEFAULT 3 CHECK (level BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE work_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_skills_all" ON work_skills FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 업무 이의신청
CREATE TABLE IF NOT EXISTS work_objections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_id bigint REFERENCES work_items(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES profiles(id),
  reason text NOT NULL,
  alternative text,
  status text DEFAULT '검토중' CHECK (status IN ('검토중','수용','기각')),
  reviewed_by uuid REFERENCES profiles(id),
  review_comment text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE work_objections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_objections_all" ON work_objections FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 업무 진행률
CREATE TABLE IF NOT EXISTS work_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_assignment_id uuid REFERENCES work_assignments(id) ON DELETE CASCADE,
  progress int DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  note text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE work_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_progress_all" ON work_progress FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 성과 평가
CREATE TABLE IF NOT EXISTS performance_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES profiles(id),
  evaluator_id uuid REFERENCES profiles(id),
  period text NOT NULL,
  eval_type text CHECK (eval_type IN ('자기평가','팀장평가','부장평가','원장확인')),
  work_score int CHECK (work_score BETWEEN 0 AND 100),
  attitude_score int CHECK (attitude_score BETWEEN 0 AND 100),
  cooperation_score int CHECK (cooperation_score BETWEEN 0 AND 100),
  total_score int,
  comment text,
  status text DEFAULT '작성중' CHECK (status IN ('작성중','제출','확정')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE performance_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "performance_eval_all" ON performance_evaluations FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 업무 의견 (댓글 / 난이도의견 / 희망신청)
CREATE TABLE IF NOT EXISTS work_opinions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_id bigint REFERENCES work_items(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES profiles(id),
  op_type text CHECK (op_type IN ('댓글','난이도의견','희망신청')),
  content text,
  difficulty int CHECK (difficulty BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE work_opinions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_opinions_all" ON work_opinions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- work_items 컬럼 추가
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS work_type text DEFAULT '사업업무' CHECK (work_type IN ('사업업무','정기업무','행정업무','돌발업무'));
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS recurring_cycle text CHECK (recurring_cycle IN ('매주','매월','매년'));
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS required_skills text[];
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS is_team_work boolean DEFAULT false;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS assignment_status text DEFAULT '배분전' CHECK (assignment_status IN ('배분전','배분안작성중','직원검토중','이의신청중','확정'));
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS period text DEFAULT '';
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS max_score int DEFAULT 10;

-- work_assignments 컬럼 추가
ALTER TABLE work_assignments ADD COLUMN IF NOT EXISTS is_co_worker boolean DEFAULT false;
