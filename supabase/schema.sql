-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- Each signed-in user can only see and change their own row.
drop policy if exists "own row select" on public.user_data;
drop policy if exists "own row insert" on public.user_data;
drop policy if exists "own row update" on public.user_data;
drop policy if exists "own row delete" on public.user_data;

create policy "own row select" on public.user_data for select to authenticated using (auth.uid() = user_id);
create policy "own row insert" on public.user_data for insert to authenticated with check (auth.uid() = user_id);
create policy "own row update" on public.user_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row delete" on public.user_data for delete to authenticated using (auth.uid() = user_id);
