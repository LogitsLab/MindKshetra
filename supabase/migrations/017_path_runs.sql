-- Path runs: progress through themed multi-day journeys (data/paths/*.json).
-- Guest progress stays on device; signed-in rows live here.

create table if not exists public.path_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  path_id text not null,
  current_day int not null default 1 check (current_day >= 1),
  completed_days int[] not null default '{}',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, path_id)
);

create index if not exists path_runs_user_idx on public.path_runs (user_id);

alter table public.path_runs enable row level security;

drop policy if exists "path_runs_select_own" on public.path_runs;
create policy "path_runs_select_own"
  on public.path_runs for select
  using (auth.uid() = user_id);

drop policy if exists "path_runs_insert_own" on public.path_runs;
create policy "path_runs_insert_own"
  on public.path_runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "path_runs_update_own" on public.path_runs;
create policy "path_runs_update_own"
  on public.path_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "path_runs_delete_own" on public.path_runs;
create policy "path_runs_delete_own"
  on public.path_runs for delete
  using (auth.uid() = user_id);
