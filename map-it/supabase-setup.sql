-- 在 Supabase SQL Editor 中执行这段代码
-- 路径：Supabase 控制台 → SQL Editor → New Query → 粘贴 → Run

-- 创建 folders 表
create table if not exists folders (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default '新文件夹',
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 开启行级安全（每个用户只能看到自己的数据）
alter table folders enable row level security;

-- 策略：用户只能读自己的数据
create policy "用户只能读自己的文件夹"
  on folders for select
  using (auth.uid() = user_id);

-- 策略：用户只能写自己的数据
create policy "用户只能写自己的文件夹"
  on folders for insert
  with check (auth.uid() = user_id);

-- 策略：用户只能更新自己的数据
create policy "用户只能更新自己的文件夹"
  on folders for update
  using (auth.uid() = user_id);

-- 策略：用户只能删除自己的数据
create policy "用户只能删除自己的文件夹"
  on folders for delete
  using (auth.uid() = user_id);
