-- 혁신 소상공인 AI활용지원사업 - 멘토매칭 보안 강화
-- 문제: small_businesses / mentor_preferences / matchings / company_preferences 테이블이
-- anon 역할에게 "select using (true)"로 전체 공개되어 있어, Supabase REST API를 직접 호출하면
-- 이름·연락처·이메일 등 개인정보를 누구나 통째로 조회할 수 있었음.
-- mentor_companies의 phone 컬럼도 anon에 노출되어 있어 CompanySelect.jsx의 "본인확인"이
-- 실질적인 인증이 되지 못했음(연락처만 알면 누구나 신청자 명단 열람 가능).
--
-- 조치:
-- 1) 위 4개 테이블의 "anon read ..." 전체공개 정책을 제거한다.
-- 2) 필요한 조회는 SECURITY DEFINER RPC 함수로만 노출한다. 각 함수는 이름+연락처 또는
--    기업ID+연락처가 실제로 일치할 때만 해당 데이터를 반환한다.
-- 3) mentor_companies는 컬럼 단위 권한으로 phone/email/ceo_name을 anon에서 차단하고
--    공개가 필요한 컬럼(id, company_name, field, intro, status)만 select 허용한다.

-- =====================================================
-- 1. 전체공개 SELECT 정책 제거
-- =====================================================
drop policy if exists "anon read small_businesses" on small_businesses;
drop policy if exists "anon read mentor_preferences" on mentor_preferences;
drop policy if exists "anon read matchings" on matchings;
drop policy if exists "anon read company_preferences" on company_preferences;

-- =====================================================
-- 2. mentor_companies 컬럼 단위 권한 제한 (phone/email/ceo_name 비공개)
-- =====================================================
revoke select on mentor_companies from anon;
grant select (id, company_name, field, intro, status) on mentor_companies to anon;

-- =====================================================
-- 3. RPC 함수 (SECURITY DEFINER) — 검증된 조회만 허용
-- =====================================================

-- 3-1. 멘토기업 본인확인 (기업ID + 연락처 일치 시에만 안전한 필드 반환)
create or replace function verify_mentor_company(p_company_id uuid, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company mentor_companies%rowtype;
begin
  select * into v_company from mentor_companies
  where id = p_company_id
    and replace(coalesce(phone, ''), '-', '') = replace(coalesce(p_phone, ''), '-', '');

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_company.id,
    'company_name', v_company.company_name,
    'field', v_company.field,
    'address', v_company.address,
    'intro', v_company.intro,
    'status', v_company.status
  );
end;
$$;

revoke all on function verify_mentor_company(uuid, text) from public;
grant execute on function verify_mentor_company(uuid, text) to anon;

-- 3-2. 멘토기업 대시보드용 신청자 목록 (본인확인 통과한 요청만 데이터 반환)
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
        'small_business_id', b.id,
        'small_businesses', jsonb_build_object(
          'id', b.id, 'name', b.name, 'company_name', b.company_name,
          'phone', b.phone, 'item', b.item, 'region', b.region
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

revoke all on function mentor_company_applicants(uuid, text) from public;
grant execute on function mentor_company_applicants(uuid, text) to anon;

-- 3-3. 소상공인 신청 상태 조회 (이름+연락처 일치 시에만 본인 신청건 반환)
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
