-- 이메일 서류 수신 및 관리 기능
-- documents / document_validations / document_status_history 테이블 + storage bucket

create table if not exists documents (
  id bigint generated always as identity primary key,
  company_name text not null,
  contact_name text not null,
  phone text not null,
  email text not null,
  business_type text,
  status text not null default '수신' check (status in ('수신','검토중','승인','반려','처리완료')),
  assignee text,
  files jsonb not null default '[]',
  memo text,
  validation_passed boolean,
  received_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_status on documents(status);
create index if not exists idx_documents_business_type on documents(business_type);
create index if not exists idx_documents_assignee on documents(assignee);
create index if not exists idx_documents_received_at on documents(received_at);

create table if not exists document_validations (
  id bigint generated always as identity primary key,
  document_id bigint not null references documents(id) on delete cascade,
  passed boolean not null,
  errors jsonb not null default '[]',
  file_checks jsonb not null default '[]',
  checked_at timestamptz not null default now()
);

create index if not exists idx_document_validations_document_id on document_validations(document_id);

create table if not exists document_status_history (
  id bigint generated always as identity primary key,
  document_id bigint not null references documents(id) on delete cascade,
  from_status text,
  to_status text not null,
  memo text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_document_status_history_document_id on document_status_history(document_id);

-- updated_at 자동 갱신
create or replace function set_documents_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_documents_updated_at on documents;
create trigger trg_documents_updated_at
  before update on documents
  for each row execute function set_documents_updated_at();

-- RLS
alter table documents enable row level security;
alter table document_validations enable row level security;
alter table document_status_history enable row level security;

create policy "authenticated users can read documents"
  on documents for select using (auth.role() = 'authenticated');
create policy "authenticated users can insert documents"
  on documents for insert with check (auth.role() = 'authenticated');
create policy "authenticated users can update documents"
  on documents for update using (auth.role() = 'authenticated');
create policy "authenticated users can delete documents"
  on documents for delete using (auth.role() = 'authenticated');

create policy "authenticated users can read document_validations"
  on document_validations for select using (auth.role() = 'authenticated');
create policy "authenticated users can insert document_validations"
  on document_validations for insert with check (auth.role() = 'authenticated');

create policy "authenticated users can read document_status_history"
  on document_status_history for select using (auth.role() = 'authenticated');
create policy "authenticated users can insert document_status_history"
  on document_status_history for insert with check (auth.role() = 'authenticated');

-- Storage bucket (서류 파일: PDF/Excel/한글, 개별 10MB 제한)
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', true, 10485760)
on conflict (id) do nothing;

create policy "authenticated users can upload documents files"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "authenticated users can read documents files"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "authenticated users can delete documents files"
  on storage.objects for delete
  using (bucket_id = 'documents' and auth.role() = 'authenticated');
