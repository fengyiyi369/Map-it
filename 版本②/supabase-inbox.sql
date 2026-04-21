-- 在 Supabase SQL Editor 中执行（New Query → 粘贴 → Run）

-- 创建 inbox 表
create table if not exists inbox (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null default '',
  saved_at timestamptz default now()
);

-- 开启行级安全
alter table inbox enable row level security;

create policy "用户只能读自己的收件箱"
  on inbox for select using (auth.uid() = user_id);

create policy "用户只能写自己的收件箱"
  on inbox for insert with check (auth.uid() = user_id);

create policy "用户只能删自己的收件箱"
  on inbox for delete using (auth.uid() = user_id);
