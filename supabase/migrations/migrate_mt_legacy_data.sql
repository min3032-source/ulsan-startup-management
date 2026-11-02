-- =====================================================================
-- Import legacy mentoring data into mt_* tables.
-- Run AFTER add_mt_mentoring_unified.sql.
-- Safe to run multiple times (legacy_source + legacy_id prevent duplicates).
-- Source tables are only read, never changed.
-- Legacy rows are read through to_jsonb(row) so column-name differences
-- between environments do not break the import.
-- =====================================================================

create or replace function mt_try_jsonb(p text) returns jsonb
language plpgsql immutable as $$
begin
  return p::jsonb;
exception when others then
  return null;
end $$;

create or replace function mt_digits(p text) returns text
language sql immutable as $$ select regexp_replace(coalesce(p,''), '[^0-9]', '', 'g') $$;

-- Rough category guess from free text (staff can refine later)
create or replace function mt_guess_fields(p text) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(jsonb_build_object('cat', c, 'sub', null)), '[]'::jsonb)
  from (
    select distinct c from (values
      ('AI',            '(ai|인공지능|생성형|자동화|데이터|챗gpt|gpt)'),
      ('마케팅',        '(마케팅|홍보|광고|브랜딩|브랜드|sns|디자인|콘텐츠|상세페이지)'),
      ('투자',          '(투자|ir|사업계획|정책자금|보증|자금)'),
      ('판로 및 수출',  '(판로|유통|입점|수출|해외|커머스|오픈마켓|조달)'),
      ('경영',          '(경영|전략|인사|노무|조직|프랜차이즈|가맹|재기|업종전환|창업)'),
      ('법률 및 회계',  '(법률|계약|분쟁|특허|상표|지식재산|회계|세무)'),
      ('기술',          '(기술|제조|기계|에너지|it|개발|소프트웨어|헬스케어|패션|주얼리)')
    ) as k(c, re)
    where lower(coalesce(p,'')) ~ re
  ) x;
$$;

-- ---------------------------------------------------------------------
-- 1. experts -> mt_mentors
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.experts') is not null then
    insert into mt_mentors (mentor_type, name, phone, email, org, position, intro,
                            legacy_field_text, fields, status, memo, legacy_source, legacy_id)
    select '개인', j->>'name', coalesce(j->>'phone',''), coalesce(j->>'email',''),
           coalesce(j->>'org',''), coalesce(j->>'role',''),
           concat_ws(E'\n', nullif(j->>'career',''), nullif(j->>'avail',''), nullif(j->>'cost','')),
           concat_ws(' / ', nullif(j->>'field',''), nullif(j->>'sub_field','')),
           mt_guess_fields(concat_ws(' ', j->>'field', j->>'sub_field', j->>'career')),
           case when j->>'status' in ('활동중','휴식중','종료') then j->>'status' else '활동중' end,
           coalesce(j->>'memo',''), 'experts', j->>'id'
    from (select to_jsonb(e) j from experts e) s
    where coalesce(j->>'name','') <> ''
    on conflict (legacy_source, legacy_id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. mentor_companies -> mt_mentors (mentor type = company)
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.mentor_companies') is not null then
    insert into mt_mentors (mentor_type, name, phone, email, org, address, intro,
                            legacy_field_text, fields, status, legacy_source, legacy_id)
    select '기업', coalesce(nullif(j->>'ceo_name',''), j->>'company_name'),
           coalesce(j->>'phone',''), coalesce(j->>'email',''), coalesce(j->>'company_name',''),
           coalesce(j->>'address',''), coalesce(j->>'intro',''),
           coalesce(j->>'field',''),
           mt_guess_fields(concat_ws(' ', j->>'field', j->>'intro')),
           case when j->>'status' in ('활동중','휴식중','종료') then j->>'status' else '활동중' end,
           'mentor_companies', j->>'id'
    from (select to_jsonb(c) j from mentor_companies c) s
    where coalesce(j->>'company_name','') <> ''
    on conflict (legacy_source, legacy_id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. expert_applications -> mt_applications (status '이관', staff reviews)
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.expert_applications') is not null then
    insert into mt_applications (payload, name, phone, email, org, bank_account,
                                 status, legacy_source, legacy_id, created_at)
    select j || jsonb_build_object('introduction_parsed', mt_try_jsonb(j->>'introduction')),
           coalesce(j->>'applicant_name', j->>'name', '(이름없음)'),
           coalesce(j->>'phone',''), coalesce(j->>'email',''),
           coalesce(j->>'current_organization', j->>'org', ''),
           coalesce(mt_try_jsonb(j->>'introduction')->>'bank_account', ''),
           '이관', 'expert_applications', j->>'id',
           coalesce((j->>'created_at')::timestamptz, now())
    from (select to_jsonb(a) j from expert_applications a) s
    on conflict (legacy_source, legacy_id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. AI program matching (small_businesses / matchings / mentoring_records)
-- ---------------------------------------------------------------------
do $$
declare v_prog uuid;
begin
  if to_regclass('public.small_businesses') is null then return; end if;

  insert into mt_programs (name, sessions, target_type, memo, legacy_source)
  values ('혁신 소상공인 AI활용지원사업 (기존 멘토매칭)', 3, '소상공인',
          '기존 멘토매칭 관리 화면 데이터 이관분', 'mentor_matching_ai')
  on conflict (legacy_source) do nothing;
  select id into v_prog from mt_programs where legacy_source = 'mentor_matching_ai';

  insert into mt_mentees (program_id, mentee_type, name, company_name, phone, email, item,
                          region, request_detail, need_fields, source_type, source_id,
                          status, legacy_source, legacy_id, created_at)
  select v_prog, '소상공인', coalesce(j->>'name',''), coalesce(j->>'company_name',''),
         coalesce(j->>'phone',''), coalesce(j->>'email',''), coalesce(j->>'item',''),
         coalesce(j->>'region',''), coalesce(j->>'memo',''),
         mt_guess_fields(j->>'item'),
         'small_business', j->>'id',
         case when j->>'status' = '매칭완료' then '매칭완료' else '대기' end,
         'small_businesses', j->>'id',
         coalesce((j->>'created_at')::timestamptz, now())
  from (select to_jsonb(b) j from small_businesses b) s
  on conflict (legacy_source, legacy_id) do nothing;

  if to_regclass('public.mentor_preferences') is not null then
    update mt_mentees me set preferred_mentor_ids = x.ids
    from (
      select p.small_business_id::text sb, array_agg(mm.id order by p.priority) ids
      from mentor_preferences p
      join mt_mentors mm on mm.legacy_source = 'mentor_companies' and mm.legacy_id = p.mentor_company_id::text
      group by p.small_business_id
    ) x
    where me.legacy_source = 'small_businesses' and me.legacy_id = x.sb
      and me.preferred_mentor_ids = '{}';
  end if;

  if to_regclass('public.matchings') is not null then
    insert into mt_matches (program_id, mentor_id, mentee_id, status, memo,
                            legacy_source, legacy_id, created_at)
    select v_prog, mm.id, me.id,
           case j->>'status' when '멘토링중' then '진행중' when '멘토링완료' then '완료' else '확정' end,
           concat_ws(' / ',
             case when (j->>'agreement_signed')::boolean then '협약완료' end,
             nullif(j->>'agreement_date',''),
             case when coalesce(j->>'matched_priority','') <> '' then (j->>'matched_priority') || '순위 매칭' end),
           'matchings', j->>'id', coalesce((j->>'created_at')::timestamptz, now())
    from (select to_jsonb(m) j from matchings m) s
    join mt_mentors mm on mm.legacy_source = 'mentor_companies' and mm.legacy_id = j->>'mentor_company_id'
    join mt_mentees me on me.legacy_source = 'small_businesses' and me.legacy_id = j->>'small_business_id'
    on conflict (legacy_source, legacy_id) do nothing;
  end if;

  if to_regclass('public.mentoring_records') is not null then
    -- plan
    insert into mt_documents (match_id, doc_type, session_no, content, status, submitted_at, legacy_source)
    select mt.id, 'plan', 0, jsonb_build_object('legacy_text', j->>'plan_content'),
           case when j->>'plan_submitted_at' is not null then '제출' else '작성중' end,
           (j->>'plan_submitted_at')::timestamptz, 'mentoring_records'
    from (select to_jsonb(r) j from mentoring_records r) s
    join mt_matches mt on mt.legacy_source = 'matchings' and mt.legacy_id = j->>'matching_id'
    where coalesce(j->>'plan_content','') <> ''
    on conflict (match_id, doc_type, session_no) do nothing;
    -- logs
    insert into mt_documents (match_id, doc_type, session_no, content, status, submitted_at, legacy_source)
    select mt.id, 'log',
           coalesce(nullif(regexp_replace(coalesce(l.v->>'session', l.v->>'session_num', ''), '[^0-9]', '', 'g'), '')::int, l.n::int),
           l.v, '제출', now(), 'mentoring_records'
    from (select to_jsonb(r) j from mentoring_records r) s
    join mt_matches mt on mt.legacy_source = 'matchings' and mt.legacy_id = j->>'matching_id'
    cross join lateral jsonb_array_elements(
        case when jsonb_typeof(j->'logs') = 'array' then j->'logs' else '[]'::jsonb end
      ) with ordinality as l(v, n)
    on conflict (match_id, doc_type, session_no) do nothing;
    -- report
    insert into mt_documents (match_id, doc_type, session_no, content, status, submitted_at, legacy_source)
    select mt.id, 'report', 0, jsonb_build_object('legacy_text', j->>'report_content'),
           case when j->>'report_submitted_at' is not null then '제출' else '작성중' end,
           (j->>'report_submitted_at')::timestamptz, 'mentoring_records'
    from (select to_jsonb(r) j from mentoring_records r) s
    join mt_matches mt on mt.legacy_source = 'matchings' and mt.legacy_id = j->>'matching_id'
    where coalesce(j->>'report_content','') <> ''
    on conflict (match_id, doc_type, session_no) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Old mentor portal (mentoring_assignments + plans/logs/reports)
-- ---------------------------------------------------------------------
do $$
declare v_prog uuid;
begin
  if to_regclass('public.mentoring_assignments') is null then return; end if;
  if not exists (select 1 from mentoring_assignments) then return; end if;

  insert into mt_programs (name, sessions, memo, legacy_source)
  values ('멘토링 포털 (기존 배정)', 3, '기존 멘토링 관리 화면 데이터 이관분', 'mentoring_portal_legacy')
  on conflict (legacy_source) do nothing;
  select id into v_prog from mt_programs where legacy_source = 'mentoring_portal_legacy';

  -- mentors: reuse existing mt_mentors when name + phone digits match
  insert into mt_mentors (name, phone, org, memo, legacy_source, legacy_id)
  select distinct on (j->>'mentor_name', mt_digits(j->>'mentor_phone'))
         j->>'mentor_name', coalesce(j->>'mentor_phone',''),
         coalesce(j->>'mentor_organization', j->>'mentor_org', ''),
         '기존 멘토링 포털에서 이관 - 정보 확인 필요',
         'mentoring_assignments', j->>'mentor_name' || '|' || mt_digits(j->>'mentor_phone')
  from (select to_jsonb(a) j from mentoring_assignments a) s
  where coalesce(j->>'mentor_name','') <> ''
    and not exists (
      select 1 from mt_mentors m
      where m.name = j->>'mentor_name'
        and (mt_digits(m.phone) = mt_digits(j->>'mentor_phone') or mt_digits(j->>'mentor_phone') = '')
    )
  on conflict (legacy_source, legacy_id) do nothing;

  insert into mt_mentees (program_id, mentee_type, name, company_name, phone, item,
                          status, legacy_source, legacy_id)
  select v_prog, '창업자',
         coalesce(j->>'startup_ceo', j->>'founder_name', ''),
         coalesce(j->>'startup_name', j->>'company_name', ''),
         coalesce(j->>'startup_phone', j->>'founder_phone', ''),
         coalesce(j->>'startup_item', j->>'item', ''),
         '매칭완료', 'mentoring_assignments', j->>'id'
  from (select to_jsonb(a) j from mentoring_assignments a) s
  on conflict (legacy_source, legacy_id) do nothing;

  insert into mt_matches (program_id, mentor_id, mentee_id, status, sessions, legacy_source, legacy_id, created_at)
  select v_prog,
         (select m.id from mt_mentors m
           where m.name = j->>'mentor_name'
             and (mt_digits(m.phone) = mt_digits(j->>'mentor_phone') or mt_digits(j->>'mentor_phone') = '')
           order by m.created_at limit 1),
         me.id, '진행중',
         nullif(j->>'total_sessions','')::int,
         'mentoring_assignments', j->>'id', coalesce((j->>'created_at')::timestamptz, now())
  from (select to_jsonb(a) j from mentoring_assignments a) s
  join mt_mentees me on me.legacy_source = 'mentoring_assignments' and me.legacy_id = j->>'id'
  where coalesce(j->>'mentor_name','') <> ''
  on conflict (legacy_source, legacy_id) do nothing;

  if to_regclass('public.mentoring_plans') is not null then
    insert into mt_documents (match_id, doc_type, session_no, content, status, submitted_at, legacy_source)
    select mt.id, 'plan', 0, j - 'id' - 'assignment_id', '제출',
           coalesce((j->>'submitted_at')::timestamptz, now()), 'mentoring_plans'
    from (select to_jsonb(p) j from mentoring_plans p) s
    join mt_matches mt on mt.legacy_source = 'mentoring_assignments' and mt.legacy_id = j->>'assignment_id'
    on conflict (match_id, doc_type, session_no) do nothing;
  end if;
  if to_regclass('public.mentoring_logs') is not null then
    insert into mt_documents (match_id, doc_type, session_no, content, status, submitted_at, legacy_source)
    select mt.id, 'log', coalesce((j->>'session_num')::int, (j->>'session_number')::int, 1),
           j - 'id' - 'assignment_id', '제출',
           coalesce((j->>'submitted_at')::timestamptz, now()), 'mentoring_logs'
    from (select to_jsonb(l) j from mentoring_logs l) s
    join mt_matches mt on mt.legacy_source = 'mentoring_assignments' and mt.legacy_id = j->>'assignment_id'
    on conflict (match_id, doc_type, session_no) do nothing;
  end if;
  if to_regclass('public.mentoring_reports') is not null then
    insert into mt_documents (match_id, doc_type, session_no, content, status, submitted_at, legacy_source)
    select mt.id, 'report', 0, j - 'id' - 'assignment_id', '제출',
           coalesce((j->>'submitted_at')::timestamptz, now()), 'mentoring_reports'
    from (select to_jsonb(r) j from mentoring_reports r) s
    join mt_matches mt on mt.legacy_source = 'mentoring_assignments' and mt.legacy_id = j->>'assignment_id'
    on conflict (match_id, doc_type, session_no) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. Verification: source count vs imported count
-- ---------------------------------------------------------------------
select 'mentors (experts)' as item,
       (select count(*) from mt_mentors where legacy_source = 'experts') as imported
union all select 'mentors (mentor_companies)', (select count(*) from mt_mentors where legacy_source = 'mentor_companies')
union all select 'mentors (old portal)',       (select count(*) from mt_mentors where legacy_source = 'mentoring_assignments')
union all select 'applications',               (select count(*) from mt_applications where legacy_source = 'expert_applications')
union all select 'mentees (small_businesses)', (select count(*) from mt_mentees where legacy_source = 'small_businesses')
union all select 'mentees (old portal)',       (select count(*) from mt_mentees where legacy_source = 'mentoring_assignments')
union all select 'matches (AI program)',       (select count(*) from mt_matches where legacy_source = 'matchings')
union all select 'matches (old portal)',       (select count(*) from mt_matches where legacy_source = 'mentoring_assignments')
union all select 'documents',                  (select count(*) from mt_documents where legacy_source is not null);

-- Possible duplicate mentors (same phone) to merge manually
select mt_digits(phone) phone_digits, array_agg(name || ' (' || coalesce(legacy_source,'') || ')') mentors
from mt_mentors
where mt_digits(phone) <> ''
group by mt_digits(phone)
having count(*) > 1;
