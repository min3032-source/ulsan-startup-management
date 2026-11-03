-- 혁신 소상공인 AI활용지원사업 - 순차 승인 매칭(1순위 → 2순위 → 3순위)
--
-- 배경: 기존에는 멘토기업이 관심업체를 최대 20개까지 체크만 해두면, 관리자가
--      "상호 선택 기반 자동 매칭"을 한번에 실행하는 방식이었다. 실제로 운영해보니
--      소상공인이 고른 1순위 멘토기업에게 먼저 사업계획서와 함께 검토를 요청하고,
--      그 멘토기업이 승인/거절을 결정 -> 거절이면 2순위, 그것도 거절이면 3순위로
--      자동으로 넘어가는 순차 심사 방식이 실무에 더 맞는 것으로 확인되어 이 기능을 추가한다.
--      기존 "관심업체 기반 자동매칭"은 1~3순위가 전부 거절된 건의 폴백으로 남겨둔다.
--
-- 실행 방법: Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 실행하세요.

-- =====================================================
-- 1. mentor_preferences: 순위별 심사 상태 추적
-- =====================================================
alter table mentor_preferences
  add column if not exists review_status text not null default '대기'
    check (review_status in ('대기','검토중','승인','거절'));
alter table mentor_preferences
  add column if not exists reviewed_at timestamptz;
alter table mentor_preferences
  add column if not exists review_note text;

create index if not exists idx_mentor_preferences_review_status
  on mentor_preferences(mentor_company_id, review_status);

-- =====================================================
-- 2. small_businesses: 사업계획서 파일 + 전체 진행 단계
-- =====================================================
alter table small_businesses
  add column if not exists business_plan_url text;
alter table small_businesses
  add column if not exists review_stage text not null default '미시작'
    check (review_stage in ('미시작','심사중','매칭완료','전체거절'));

-- =====================================================
-- 3. 사업계획서 업로드용 스토리지 버킷
--    (기존 education-posters / documents 버킷과 동일하게 public + anon insert)
-- =====================================================
insert into storage.buckets (id, name, public)
  values ('mentor-business-plans', 'mentor-business-plans', true)
  on conflict (id) do nothing;

drop policy if exists "anon upload mentor business plans" on storage.objects;
create policy "anon upload mentor business plans" on storage.objects
  for insert to anon
  with check (bucket_id = 'mentor-business-plans');

drop policy if exists "public read mentor business plans" on storage.objects;
create policy "public read mentor business plans" on storage.objects
  for select using (bucket_id = 'mentor-business-plans');

-- =====================================================
-- 4. 소상공인이 신청 이후에도 사업계획서를 등록/재등록할 수 있는 RPC
--    (anon은 small_businesses에 대한 update 권한이 없으므로, 이름+연락처가
--     실제로 일치할 때만 business_plan_url을 갱신하는 통로를 별도로 연다)
-- =====================================================
create or replace function submit_business_plan(p_name text, p_phone text, p_url text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update small_businesses
  set business_plan_url = p_url
  where name = p_name and phone = p_phone;

  return found;
end;
$$;

revoke all on function submit_business_plan(text, text, text) from public;
grant execute on function submit_business_plan(text, text, text) to anon;

-- =====================================================
-- 5. 멘토기업의 승인/거절 결정
--    본인확인(기업ID+연락처) 통과 + 실제로 "지금 이 멘토기업 차례"(review_status='검토중')일
--    때만 처리한다. 거절이면 다음 순위 행을 자동으로 '검토중'으로 올린다.
--    다음 순위가 없으면(3순위까지 전부 거절) review_stage를 '전체거절'로 표시해
--    관리자가 기존 관심업체 기반 자동매칭으로 폴백할 수 있게 한다.
-- =====================================================
create or replace function mentor_review_decision(
  p_company_id uuid, p_phone text, p_small_business_id uuid,
  p_decision text, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pref mentor_preferences%rowtype;
  v_next mentor_preferences%rowtype;
begin
  if p_decision not in ('승인','거절') then
    return jsonb_build_object('error', 'invalid_decision');
  end if;

  if not exists (
    select 1 from mentor_companies
    where id = p_company_id
      and replace(coalesce(phone, ''), '-', '') = replace(coalesce(p_phone, ''), '-', '')
  ) then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  select * into v_pref from mentor_preferences
  where small_business_id = p_small_business_id
    and mentor_company_id = p_company_id
    and review_status = '검토중';

  if not found then
    return jsonb_build_object('error', 'not_your_turn');
  end if;

  if p_decision = '승인' then
    update mentor_preferences set review_status = '승인', reviewed_at = now(), review_note = p_note
      where id = v_pref.id;

    insert into matchings (small_business_id, mentor_company_id, matched_priority)
      values (p_small_business_id, p_company_id, v_pref.priority)
      on conflict (small_business_id) do nothing;

    update small_businesses set status = '매칭완료', review_stage = '매칭완료'
      where id = p_small_business_id;

    return jsonb_build_object('result', '승인');
  end if;

  -- 거절: 이 순위는 거절 처리하고, 다음 순위가 있으면 그쪽을 '검토중'으로 올린다
  update mentor_preferences set review_status = '거절', reviewed_at = now(), review_note = p_note
    where id = v_pref.id;

  select * into v_next from mentor_preferences
  where small_business_id = p_small_business_id
    and priority = v_pref.priority + 1
    and review_status = '대기';

  if found then
    update mentor_preferences set review_status = '검토중' where id = v_next.id;
    return jsonb_build_object('result', '거절', 'next_priority', v_next.priority);
  else
    update small_businesses set review_stage = '전체거절' where id = p_small_business_id;
    return jsonb_build_object('result', '거절', 'next_priority', null);
  end if;
end;
$$;

revoke all on function mentor_review_decision(uuid, text, uuid, text, text) from public;
grant execute on function mentor_review_decision(uuid, text, uuid, text, text) to anon;

-- =====================================================
-- 6. mentor_company_applicants RPC 갱신
--    - review_status / business_plan_url / memo를 함께 반환해 멘토기업 포털에서
--      "지금 내 차례인 검토 요청" 탭과 사업계획서 링크를 보여줄 수 있게 한다.
-- =====================================================
create or replace function mentor_company_applicants(p_company_id uuid, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from mentor_companies
    where id = p_company_id
      and replace(coalesce(phone, ''), '-', '') = replace(coalesce(p_phone, ''), '-', '')
  ) then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  return jsonb_build_object(
    'applicants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'priority', mp.priority,
        'review_status', mp.review_status,
        'reviewed_at', mp.reviewed_at,
        'small_business_id', b.id,
        'small_businesses', jsonb_build_object(
          'id', b.id, 'name', b.name, 'company_name', b.company_name,
          'phone', b.phone, 'item', b.item, 'region', b.region,
          'memo', b.memo, 'business_plan_url', b.business_plan_url
        )
      ) order by mp.priority)
      from mentor_preferences mp
      join small_businesses b on b.id = mp.small_business_id
      where mp.mentor_company_id = p_company_id
    ), '[]'::jsonb),
    'interested', coalesce((
      select jsonb_agg(cp.small_business_id)
      from company_preferences cp
      where cp.mentor_company_id = p_company_id
    ), '[]'::jsonb),
    'matched', coalesce((
      select jsonb_agg(m.small_business_id)
      from matchings m
      where m.mentor_company_id = p_company_id
    ), '[]'::jsonb)
  );
end;
$$;

-- =====================================================
-- 7. business_application_status RPC 갱신
--    - review_stage(전체 진행 단계), 순위별 review_status를 함께 반환해
--      소상공인이 "몇 순위 멘토기업이 검토 중인지"를 조회 페이지에서 볼 수 있게 한다.
-- =====================================================
create or replace function business_application_status(p_name text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_biz small_businesses%rowtype;
  v_result jsonb;
begin
  select * into v_biz from small_businesses
  where name = p_name and phone = p_phone
  limit 1;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'business', to_jsonb(v_biz),
    'prefs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'priority', mp.priority,
        'review_status', mp.review_status,
        'mentor_companies', jsonb_build_object('company_name', mc.company_name, 'field', mc.field)
      ) order by mp.priority)
      from mentor_preferences mp
      join mentor_companies mc on mc.id = mp.mentor_company_id
      where mp.small_business_id = v_biz.id
    ), '[]'::jsonb),
    'has_interest', exists(select 1 from company_preferences cp where cp.small_business_id = v_biz.id),
    'matching', (
      select jsonb_build_object(
        'agreement_signed', m.agreement_signed,
        'agreement_date', m.agreement_date,
        'status', m.status,
        'mentor_companies', jsonb_build_object('company_name', mc2.company_name)
      )
      from matchings m
      join mentor_companies mc2 on mc2.id = m.mentor_company_id
      where m.small_business_id = v_biz.id
      limit 1
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function business_application_status(text, text) from public;
grant execute on function business_application_status(text, text) to anon;
