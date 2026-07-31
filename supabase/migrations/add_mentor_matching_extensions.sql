-- 혁신 소상공인 AI활용지원사업 - 3개 플랫폼 확장
-- apply.ubpi.or.kr (소상공인 신청) / company.ubpi.or.kr (멘토기업 조회) 지원

-- 1. 소상공인 지역 필드 추가 (멘토기업 조회 플랫폼 지역 필터용)
alter table small_businesses add column if not exists region text;

-- 2. 멘토기업당 관심 소상공인 최대 20개 제한 (DB 레벨 안전장치)
create or replace function enforce_company_preference_limit()
returns trigger as $$
begin
  if (select count(*) from company_preferences where mentor_company_id = new.mentor_company_id) >= 20 then
    raise exception '관심 소상공인은 기업당 최대 20개까지 선택할 수 있습니다.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_company_preferences_limit on company_preferences;
create trigger trg_company_preferences_limit
  before insert on company_preferences
  for each row execute function enforce_company_preference_limit();
