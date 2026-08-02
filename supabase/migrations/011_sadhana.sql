-- Sadhana practice log + per-practice streaks (plan Phase 1).
--
-- One data model serves the Daily Sadhana flow, the japa counter, the
-- meditation timer, and pranayama: a session log plus a streak row per
-- practice. Reading/reflection days come free from verse_completions and
-- journal_entries, so they are deliberately NOT duplicated here.
--
-- client_ref is a client-generated uuid; (user_id, client_ref) is unique so
-- the guest→account merge can replay a local log idempotently (upsert with
-- ignoreDuplicates) without double-counting.

create table if not exists sadhana_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  practice text not null check (practice in ('flow', 'japa', 'sit', 'pranayama')),
  occurred_on date not null,
  duration_sec integer check (duration_sec is null or duration_sec between 0 and 86400),
  count integer check (count is null or count between 0 and 100000),
  details jsonb,
  client_ref uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (user_id, client_ref)
);

create index if not exists sadhana_sessions_user_day_idx
  on sadhana_sessions (user_id, occurred_on desc);

create table if not exists sadhana_streaks (
  user_id uuid references auth.users(id) on delete cascade not null,
  practice text not null check (practice in ('flow', 'japa', 'sit', 'pranayama')),
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_day date,
  -- Same rest-day mechanic as user_streaks.grace_used_on (migration 010).
  grace_used_on date,
  updated_at timestamptz not null default now(),
  primary key (user_id, practice)
);

alter table sadhana_sessions enable row level security;
alter table sadhana_streaks enable row level security;

drop policy if exists "sadhana_sessions_own" on sadhana_sessions;
create policy "sadhana_sessions_own" on sadhana_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sadhana_streaks_own" on sadhana_streaks;
create policy "sadhana_streaks_own" on sadhana_streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
