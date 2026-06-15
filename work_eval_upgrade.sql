-- =============================================
-- 성과평가 시스템 재설계
-- 팀원: 팀장 70% + 부장 30%
-- 팀장: 부장 100%
-- 부장: 원장 확인
-- =============================================

-- 기존 테이블 삭제 후 재생성
DROP TABLE IF EXISTS performance_evaluations CASCADE;

CREATE TABLE performance_evaluations (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  evaluator_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  period        text NOT NULL,
  eval_type     text CHECK (eval_type IN ('팀장평가','부장평가','원장확인')),
  eval_weight   numeric DEFAULT 1.0,
  work_score    int CHECK (work_score BETWEEN 0 AND 100),
  attitude_score    int CHECK (attitude_score BETWEEN 0 AND 100),
  cooperation_score int CHECK (cooperation_score BETWEEN 0 AND 100),
  total_score   numeric,
  comment       text,
  status        text DEFAULT '작성중' CHECK (status IN ('작성중','제출','확정')),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE performance_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "performance_eval_all" ON performance_evaluations
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 평가 시즌 설정
CREATE TABLE IF NOT EXISTS eval_season_settings (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period     text NOT NULL UNIQUE,
  start_date date,
  end_date   date,
  is_active  boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE eval_season_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eval_season_all" ON eval_season_settings
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 평가 결과 이의신청
CREATE TABLE IF NOT EXISTS eval_objections (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  period         text NOT NULL,
  reason         text NOT NULL,
  status         text DEFAULT '검토중' CHECK (status IN ('검토중','수용','기각')),
  reviewed_by    uuid REFERENCES profiles(id),
  review_comment text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE eval_objections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eval_objections_all" ON eval_objections
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 최종 점수 집계 뷰 (제출/확정된 평가만)
CREATE OR REPLACE VIEW performance_final_scores AS
SELECT
  e.employee_id,
  emp.name    AS employee_name,
  emp.role    AS employee_role,
  e.period,
  ROUND(SUM(e.total_score * e.eval_weight)::numeric, 1) AS final_score,
  json_agg(json_build_object(
    'id',          e.id,
    'eval_type',   e.eval_type,
    'evaluator',   ev.name,
    'total_score', e.total_score,
    'weight',      e.eval_weight,
    'comment',     e.comment,
    'status',      e.status
  ) ORDER BY e.eval_type) AS evaluations
FROM performance_evaluations e
JOIN profiles emp ON emp.id = e.employee_id
JOIN profiles ev  ON ev.id  = e.evaluator_id
WHERE e.status IN ('제출','확정')
GROUP BY e.employee_id, emp.name, emp.role, e.period;
