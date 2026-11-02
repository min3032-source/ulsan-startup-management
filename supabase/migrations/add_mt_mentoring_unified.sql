-- =====================================================================
-- Unified mentoring system (mt_*)
-- Run in Supabase SQL Editor. Safe to run multiple times.
-- Existing tables (experts, mentor_companies, mentoring_assignments ...)
-- are NOT modified or deleted.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. Helper: staff check (active profile). Managers+ can write.
-- ---------------------------------------------------------------------
create or replace function mt_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and coalesce(p.is_active, true)
  );
$$;

create or replace function mt_is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and coalesce(p.is_active, true)
      and p.role in ('master','admin','manager')
  );
$$;

create or replace function mt_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and coalesce(p.is_active, true)
      and p.role in ('master','admin')
  );
$$;

create or replace function mt_new_token() returns text
language sql volatile as $$
  select translate(encode(gen_random_bytes(18), 'base64'), '+/=', 'xyz');
$$;

-- ---------------------------------------------------------------------
-- 1. Mentors
-- ---------------------------------------------------------------------
create table if not exists mt_mentors (
  id                 uuid primary key default gen_random_uuid(),
  mentor_type        text not null default '개인' check (mentor_type in ('개인','기업')),
  name               text not null,
  birth_date         date,
  phone              text default '',
  email              text default '',
  org                text default '',
  position           text default '',
  education          text default '',
  major              text default '',
  address            text default '',
  photo_path         text,
  grade              int check (grade in (1,2,3)),
  fields             jsonb not null default '[]',   -- [{"cat":"AI","sub":"업무자동화"}]
  field_etc          text default '',
  priority_fields    text[] not null default '{}',  -- up to 3 sub fields
  keywords           text[] not null default '{}',
  regions            text[] not null default '{}',  -- 울산/부산/경남/전국
  methods            text[] not null default '{}',  -- 대면/비대면
  educations         jsonb not null default '[]',
  licenses           jsonb not null default '[]',
  careers            jsonb not null default '[]',
  track_records      jsonb not null default '[]',
  intro              text default '',
  legacy_field_text  text default '',
  max_active_matches int not null default 5,
  status             text not null default '활동중' check (status in ('활동중','휴식중','종료')),
  access_token       text unique default mt_new_token(),
  memo               text default '',
  legacy_source      text,
  legacy_id          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (legacy_source, legacy_id)
);
create index if not exists idx_mt_mentors_status on mt_mentors(status);

-- Sensitive data: admin only
create table if not exists mt_mentor_private (
  mentor_id    uuid primary key references mt_mentors(id) on delete cascade,
  bank_name    text default '',
  bank_account text default '',
  account_holder text default '',
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Registration applications (public form)
-- ---------------------------------------------------------------------
create table if not exists mt_applications (
  id              uuid primary key default gen_random_uuid(),
  payload         jsonb not null default '{}',   -- full form
  name            text not null,
  phone           text default '',
  email           text default '',
  org             text default '',
  requested_grade int,
  bank_name       text default '',
  bank_account    text default '',
  account_holder  text default '',
  files           jsonb not null default '[]',   -- [{kind,path,name,size}]
  agreed_privacy  boolean not null default false,
  agreed_third    boolean not null default false,
  agreed_integrity boolean not null default false,
  status          text not null default '접수' check (status in ('접수','보완요청','승인','반려','이관')),
  decided_grade   int,
  review_comment  text default '',
  mentor_id       uuid references mt_mentors(id) on delete set null,
  legacy_source   text,
  legacy_id       text,
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  unique (legacy_source, legacy_id)
);

-- ---------------------------------------------------------------------
-- 3. Programs and mentees
-- ---------------------------------------------------------------------
create table if not exists mt_programs (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  year            int default extract(year from now())::int,
  start_date      date,
  end_date        date,
  sessions        int not null default 3,
  min_grade       int check (min_grade in (1,2,3)),     -- null = no limit
  fee_by_grade    jsonb not null default '{"1":0,"2":0,"3":0}',  -- per session (KRW)
  target_type     text default '',
  staff           text default '',
  status          text not null default '운영중' check (status in ('준비','운영중','종료')),
  memo            text default '',
  legacy_source   text,
  created_at      timestamptz not null default now(),
  unique (legacy_source)
);

create table if not exists mt_mentees (
  id                   uuid primary key default gen_random_uuid(),
  program_id           uuid references mt_programs(id) on delete cascade,
  mentee_type          text not null default '창업자' check (mentee_type in ('예비창업자','창업자','소상공인','중소기업','기타')),
  name                 text not null,          -- representative
  company_name         text default '',
  phone                text default '',
  email                text default '',
  item                 text default '',
  region               text default '',
  need_fields          jsonb not null default '[]',   -- same shape as mt_mentors.fields
  need_keywords        text[] not null default '{}',
  method               text default '모두',          -- 대면/비대면/모두
  preferred_mentor_ids uuid[] not null default '{}', -- 1st,2nd,3rd
  request_detail       text default '',
  source_type          text default 'direct',        -- founder/selected_firm/small_business/direct
  source_id            text,
  status               text not null default '대기' check (status in ('대기','매칭완료','완료','취소')),
  legacy_source        text,
  legacy_id            text,
  created_at           timestamptz not null default now(),
  unique (legacy_source, legacy_id)
);
create index if not exists idx_mt_mentees_program on mt_mentees(program_id);

create table if not exists mt_conflicts (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references mt_mentors(id) on delete cascade,
  mentee_id  uuid references mt_mentees(id) on delete cascade,
  company_name text default '',
  reason     text default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Matches
-- ---------------------------------------------------------------------
create table if not exists mt_matches (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid references mt_programs(id) on delete cascade,
  mentor_id     uuid not null references mt_mentors(id) on delete cascade,
  mentee_id     uuid not null references mt_mentees(id) on delete cascade,
  score         numeric,
  score_detail  jsonb not null default '[]',
  status        text not null default '확정' check (status in ('확정','진행중','완료','취소')),
  sessions      int,          -- override program sessions
  staff         text default '',
  memo          text default '',
  legacy_source text,
  legacy_id     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (legacy_source, legacy_id)
);
create index if not exists idx_mt_matches_mentor on mt_matches(mentor_id);
create index if not exists idx_mt_matches_mentee on mt_matches(mentee_id);
create unique index if not exists uq_mt_matches_active
  on mt_matches(mentee_id, mentor_id) where status <> '취소';

-- ---------------------------------------------------------------------
-- 5. Documents (plan / log per session / report) and files
-- ---------------------------------------------------------------------
create table if not exists mt_documents (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references mt_matches(id) on delete cascade,
  doc_type       text not null check (doc_type in ('plan','log','report')),
  session_no     int not null default 0,   -- 0 for plan/report
  content        jsonb not null default '{}',
  status         text not null default '작성중' check (status in ('작성중','제출','반려','승인')),
  review_comment text default '',
  submitted_at   timestamptz,
  reviewed_at    timestamptz,
  legacy_source  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (match_id, doc_type, session_no)
);

create table if not exists mt_files (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references mt_matches(id) on delete cascade,
  doc_type    text not null check (doc_type in ('plan','log','report','evidence')),
  session_no  int not null default 0,
  path        text not null,
  file_name   text not null,
  size        bigint,
  mime        text,
  uploaded_by text default 'mentor',
  created_at  timestamptz not null default now()
);
create index if not exists idx_mt_files_match on mt_files(match_id);

-- updated_at triggers
create or replace function mt_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_mt_mentors_touch on mt_mentors;
create trigger trg_mt_mentors_touch before update on mt_mentors for each row execute function mt_touch();
drop trigger if exists trg_mt_matches_touch on mt_matches;
create trigger trg_mt_matches_touch before update on mt_matches for each row execute function mt_touch();
drop trigger if exists trg_mt_documents_touch on mt_documents;
create trigger trg_mt_documents_touch before update on mt_documents for each row execute function mt_touch();

-- ---------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------
alter table mt_mentors        enable row level security;
alter table mt_mentor_private enable row level security;
alter table mt_applications   enable row level security;
alter table mt_programs       enable row level security;
alter table mt_mentees        enable row level security;
alter table mt_conflicts      enable row level security;
alter table mt_matches        enable row level security;
alter table mt_documents      enable row level security;
alter table mt_files          enable row level security;

do $$
declare t text;
begin
  foreach t in array array['mt_mentors','mt_programs','mt_mentees','mt_conflicts','mt_matches','mt_documents','mt_files']
  loop
    execute format('drop policy if exists %I on %I', t||'_staff_read', t);
    execute format('create policy %I on %I for select to authenticated using (mt_is_staff())', t||'_staff_read', t);
    execute format('drop policy if exists %I on %I', t||'_editor_write', t);
    execute format('create policy %I on %I for all to authenticated using (mt_is_editor()) with check (mt_is_editor())', t||'_editor_write', t);
  end loop;
end $$;

drop policy if exists mt_mentor_private_admin on mt_mentor_private;
create policy mt_mentor_private_admin on mt_mentor_private
  for all to authenticated using (mt_is_admin()) with check (mt_is_admin());

-- Public registration: insert only (no read)
drop policy if exists mt_applications_public_insert on mt_applications;
create policy mt_applications_public_insert on mt_applications
  for insert to anon, authenticated
  with check (status = '접수' and mentor_id is null and legacy_source is null);

-- Applications contain bank account: only master/admin may read or review them.
drop policy if exists mt_applications_staff_read on mt_applications;
drop policy if exists mt_applications_editor_write on mt_applications;
drop policy if exists mt_applications_admin_all on mt_applications;
create policy mt_applications_admin_all on mt_applications
  for all to authenticated using (mt_is_admin()) with check (mt_is_admin());

-- ---------------------------------------------------------------------
-- 7. Storage bucket (private)
--   applications/<application-id>/...  : public upload, staff read
--   m/<mentor-token>/<match-id>/...     : mentor upload/read with token, staff all
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('mt-files', 'mt-files', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

create or replace function mt_token_valid(p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mt_mentors where access_token = p_token and status <> '종료');
$$;

drop policy if exists mt_files_public_apply_upload on storage.objects;
create policy mt_files_public_apply_upload on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'mt-files' and (storage.foldername(name))[1] = 'applications');

drop policy if exists mt_files_mentor_upload on storage.objects;
create policy mt_files_mentor_upload on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'mt-files' and (storage.foldername(name))[1] = 'm'
              and mt_token_valid((storage.foldername(name))[2]));

drop policy if exists mt_files_mentor_read on storage.objects;
create policy mt_files_mentor_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'mt-files' and (storage.foldername(name))[1] = 'm'
         and mt_token_valid((storage.foldername(name))[2]));

drop policy if exists mt_files_staff_all on storage.objects;
create policy mt_files_staff_all on storage.objects
  for all to authenticated
  using (bucket_id = 'mt-files' and mt_is_staff())
  with check (bucket_id = 'mt-files' and mt_is_editor());

-- ---------------------------------------------------------------------
-- 8. Mentor portal RPCs (token based, no Supabase login for mentors)
-- ---------------------------------------------------------------------
create or replace function mt_portal_get(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_mentor mt_mentors; v jsonb;
begin
  select * into v_mentor from mt_mentors where access_token = p_token and status <> '종료';
  if not found then return null; end if;
  select jsonb_build_object(
    'mentor', jsonb_build_object('id', v_mentor.id, 'name', v_mentor.name, 'org', v_mentor.org,
                                 'grade', v_mentor.grade, 'email', v_mentor.email),
    'matches', coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'status', m.status,
        'sessions', coalesce(m.sessions, p.sessions, 3),
        'program', jsonb_build_object('id', p.id, 'name', p.name, 'start_date', p.start_date, 'end_date', p.end_date),
        'mentee', jsonb_build_object('name', e.name, 'company_name', e.company_name, 'phone', e.phone,
                                     'email', e.email, 'item', e.item, 'region', e.region,
                                     'request_detail', e.request_detail),
        'documents', coalesce((select jsonb_agg(to_jsonb(d) order by d.doc_type, d.session_no)
                               from mt_documents d where d.match_id = m.id), '[]'::jsonb),
        'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'doc_type', f.doc_type,
                               'session_no', f.session_no, 'path', f.path, 'file_name', f.file_name,
                               'size', f.size, 'created_at', f.created_at) order by f.created_at)
                           from mt_files f where f.match_id = m.id), '[]'::jsonb)
      ) order by m.created_at desc) filter (where m.id is not null), '[]'::jsonb)
  ) into v
  from mt_matches m
  left join mt_programs p on p.id = m.program_id
  left join mt_mentees e on e.id = m.mentee_id
  where m.mentor_id = v_mentor.id and m.status <> '취소';
  return v;
end $$;

create or replace function mt_portal_check_match(p_token text, p_match uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid;
begin
  select m.id into v_id from mt_matches m join mt_mentors t on t.id = m.mentor_id
   where t.access_token = p_token and t.status <> '종료' and m.id = p_match and m.status <> '취소';
  if v_id is null then raise exception 'not allowed'; end if;
  return v_id;
end $$;

create or replace function mt_portal_save_doc(p_token text, p_match uuid, p_doc_type text,
                                               p_session int, p_content jsonb, p_submit boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_doc mt_documents;
begin
  perform mt_portal_check_match(p_token, p_match);
  if p_doc_type not in ('plan','log','report') then raise exception 'bad doc type'; end if;
  select * into v_doc from mt_documents
   where match_id = p_match and doc_type = p_doc_type and session_no = coalesce(p_session, 0);
  if found and v_doc.status in ('제출','승인') then
    raise exception '제출 또는 승인된 문서는 수정할 수 없습니다';
  end if;
  insert into mt_documents (match_id, doc_type, session_no, content, status, submitted_at)
  values (p_match, p_doc_type, coalesce(p_session,0), coalesce(p_content,'{}'::jsonb),
          case when p_submit then '제출' else '작성중' end,
          case when p_submit then now() end)
  on conflict (match_id, doc_type, session_no) do update
     set content = excluded.content,
         status = excluded.status,
         submitted_at = coalesce(excluded.submitted_at, mt_documents.submitted_at)
  returning * into v_doc;
  update mt_matches set status = '진행중' where id = p_match and status = '확정';
  return to_jsonb(v_doc);
end $$;

create or replace function mt_portal_add_file(p_token text, p_match uuid, p_doc_type text,
                                               p_session int, p_path text, p_name text,
                                               p_size bigint, p_mime text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_file mt_files;
begin
  perform mt_portal_check_match(p_token, p_match);
  if p_path not like ('m/' || p_token || '/' || p_match::text || '/%') then
    raise exception 'bad path';
  end if;
  insert into mt_files (match_id, doc_type, session_no, path, file_name, size, mime, uploaded_by)
  values (p_match, p_doc_type, coalesce(p_session,0), p_path, p_name, p_size, p_mime, 'mentor')
  returning * into v_file;
  return to_jsonb(v_file);
end $$;

create or replace function mt_portal_delete_file(p_token text, p_file uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_file mt_files; v_status text;
begin
  select * into v_file from mt_files where id = p_file;
  if not found then return false; end if;
  perform mt_portal_check_match(p_token, v_file.match_id);
  select status into v_status from mt_documents
   where match_id = v_file.match_id and doc_type = v_file.doc_type and session_no = v_file.session_no;
  if v_status in ('제출','승인') then raise exception '제출된 문서의 파일은 삭제할 수 없습니다'; end if;
  delete from mt_files where id = p_file;
  return true;
end $$;

-- Staff: reissue a mentor access token
create or replace function mt_reissue_token(p_mentor uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not mt_is_editor() then raise exception 'not allowed'; end if;
  v := mt_new_token();
  update mt_mentors set access_token = v where id = p_mentor;
  return v;
end $$;

revoke all on function mt_portal_get(text) from public;
revoke all on function mt_portal_save_doc(text, uuid, text, int, jsonb, boolean) from public;
revoke all on function mt_portal_add_file(text, uuid, text, int, text, text, bigint, text) from public;
revoke all on function mt_portal_delete_file(text, uuid) from public;
revoke all on function mt_portal_check_match(text, uuid) from public;
grant execute on function mt_portal_get(text) to anon, authenticated;
grant execute on function mt_portal_save_doc(text, uuid, text, int, jsonb, boolean) to anon, authenticated;
grant execute on function mt_portal_add_file(text, uuid, text, int, text, text, bigint, text) to anon, authenticated;
grant execute on function mt_portal_delete_file(text, uuid) to anon, authenticated;
grant execute on function mt_token_valid(text) to anon, authenticated;
grant execute on function mt_reissue_token(uuid) to authenticated;
