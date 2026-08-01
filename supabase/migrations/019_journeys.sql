-- Journeys: one runs table for both themed scripture paths (017 path_runs)
-- and the meditation course (018 meditation_runs).
--
-- DEPLOY ORDER: code that reads journey_runs must be live BEFORE this runs.
-- The old tables are left in place and readable for one release so a rollback
-- (or a stale client) keeps working; a later migration drops them once no code
-- references them. Nothing here deletes a row.
--
-- Re-runnable: every statement is idempotent, and the backfill is an upsert
-- keyed on (user_id, journey_id) that only ever unions day arrays — running it
-- twice cannot lose or duplicate a day.

create table if not exists public.journey_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  journey_id text not null,
  current_day int not null default 1 check (current_day >= 1),
  completed_days int[] not null default '{}',
  -- Reserved for tier-3 goal tracks (anxiety/sleep/focus/stress), as
  -- meditation_runs already carried.
  track text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, journey_id)
);

create index if not exists journey_runs_user_idx on public.journey_runs (user_id);

alter table public.journey_runs enable row level security;

drop policy if exists "journey_runs_select_own" on public.journey_runs;
create policy "journey_runs_select_own"
  on public.journey_runs for select
  using (auth.uid() = user_id);

drop policy if exists "journey_runs_insert_own" on public.journey_runs;
create policy "journey_runs_insert_own"
  on public.journey_runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "journey_runs_update_own" on public.journey_runs;
create policy "journey_runs_update_own"
  on public.journey_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "journey_runs_delete_own" on public.journey_runs;
create policy "journey_runs_delete_own"
  on public.journey_runs for delete
  using (auth.uid() = user_id);

-- ── Backfill ───────────────────────────────────────────────────────────────
-- Both legacy tables carry (user_id, <id>, current_day, completed_days).
-- On conflict we union the day arrays and keep the furthest cursor, so a
-- second run — or a row already written by new code — is a no-op, never a
-- regression.

do $$
begin
  if to_regclass('public.path_runs') is not null then
    insert into public.journey_runs
      (user_id, journey_id, current_day, completed_days, started_at, updated_at)
    select
      user_id, path_id, current_day, completed_days, started_at, updated_at
    from public.path_runs
    on conflict (user_id, journey_id) do update
      set completed_days = (
            select coalesce(array_agg(d order by d), '{}')
            from (
              select distinct unnest(
                public.journey_runs.completed_days || excluded.completed_days
              ) as d
            ) u
          ),
          current_day = greatest(
            public.journey_runs.current_day, excluded.current_day
          ),
          updated_at = now();
  end if;

  if to_regclass('public.meditation_runs') is not null then
    insert into public.journey_runs
      (user_id, journey_id, current_day, completed_days, track, started_at, updated_at)
    select
      user_id, program_id, current_day, completed_days, track, started_at, updated_at
    from public.meditation_runs
    on conflict (user_id, journey_id) do update
      set completed_days = (
            select coalesce(array_agg(d order by d), '{}')
            from (
              select distinct unnest(
                public.journey_runs.completed_days || excluded.completed_days
              ) as d
            ) u
          ),
          current_day = greatest(
            public.journey_runs.current_day, excluded.current_day
          ),
          track = coalesce(public.journey_runs.track, excluded.track),
          updated_at = now();
  end if;
end $$;
