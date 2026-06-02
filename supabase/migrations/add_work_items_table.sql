-- AI 업무 자동 제안으로 생성된 업무 항목 테이블
create table if not exists work_items (
  id bigint generated always as identity primary key,
  program_id bigint references budget_programs(id) on delete cascade,
  program_name text,
  title text not null,
  description text,
  category text check (category in ('기획','홍보','운영','행정','정산','보고')),
  difficulty smallint check (difficulty between 1 and 5),
  difficulty_reason text,
  status text default '대기' check (status in ('대기','진행중','완료','보류')),
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table work_items enable row level security;

create policy "authenticated users can read work_items"
  on work_items for select
  using (auth.role() = 'authenticated');

create policy "authenticated users can insert work_items"
  on work_items for insert
  with check (auth.role() = 'authenticated');

create policy "authenticated users can update work_items"
  on work_items for update
  using (auth.role() = 'authenticated');

create policy "authenticated users can delete work_items"
  on work_items for delete
  using (auth.role() = 'authenticated');
