-- Progressive meditation course progress (peer to path_runs / sadhana).
-- Content lives in data/meditation/*.json; this stores unlock + mood check-ins.
-- Also widens sadhana practice enum so 'meditation' shares grace-day streaks.

-- ─── Extend sadhana practice checks ─────────────────────────────────────────
alter table public.sadhana_sessions drop constraint if exists sadhana_sessions_practice_check;
alter table public.sadhana_sessions
  add constraint sadhana_sessions_practice_check
  check (practice in ('flow', 'japa', 'sit', 'pranayama', 'meditation'));

alter table public.sadhana_streaks drop constraint if exists sadhana_streaks_practice_check;
alter table public.sadhana_streaks
  add constraint sadhana_streaks_practice_check
  check (practice in ('flow', 'japa', 'sit', 'pranayama', 'meditation'));

-- ─── Course run (unlock state per program) ───────────────────────────────────
create table if not exists public.meditation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id text not null,
  current_day int not null default 1 check (current_day >= 1),
  completed_days int[] not null default '{}',
  track text null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, program_id)
);

create index if not exists meditation_runs_user_idx
  on public.meditation_runs (user_id);

alter table public.meditation_runs enable row level security;

drop policy if exists "meditation_runs_select_own" on public.meditation_runs;
create policy "meditation_runs_select_own"
  on public.meditation_runs for select
  using (auth.uid() = user_id);

drop policy if exists "meditation_runs_insert_own" on public.meditation_runs;
create policy "meditation_runs_insert_own"
  on public.meditation_runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "meditation_runs_update_own" on public.meditation_runs;
create policy "meditation_runs_update_own"
  on public.meditation_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "meditation_runs_delete_own" on public.meditation_runs;
create policy "meditation_runs_delete_own"
  on public.meditation_runs for delete
  using (auth.uid() = user_id);

-- ─── Per-session completion + mood ───────────────────────────────────────────
create table if not exists public.meditation_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null,
  completed_at timestamptz not null default now(),
  mood_before smallint check (mood_before is null or mood_before between 1 and 5),
  mood_after smallint check (mood_after is null or mood_after between 1 and 5),
  duration_sec integer check (duration_sec is null or duration_sec between 0 and 86400),
  client_ref uuid not null default gen_random_uuid(),
  unique (user_id, client_ref)
);

create index if not exists meditation_completions_user_idx
  on public.meditation_completions (user_id, completed_at desc);

create index if not exists meditation_completions_session_idx
  on public.meditation_completions (session_id);

alter table public.meditation_completions enable row level security;

drop policy if exists "meditation_completions_select_own" on public.meditation_completions;
create policy "meditation_completions_select_own"
  on public.meditation_completions for select
  using (auth.uid() = user_id);

drop policy if exists "meditation_completions_insert_own" on public.meditation_completions;
create policy "meditation_completions_insert_own"
  on public.meditation_completions for insert
  with check (auth.uid() = user_id);

-- No update/delete for completions — append-only impact trail.
