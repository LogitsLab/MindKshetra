-- Push notifications (plan Phase 2). Expo Push Service; dispatch runs via
-- GET /api/cron/push-dispatch on a GitHub Actions half-hourly schedule
-- (Vercel cron is too coarse for per-user local-hour windows).
--
-- push_sends makes the half-hourly cron idempotent: (user, kind, local day)
-- is unique, so a rerun can never double-send.

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on push_tokens (user_id);

alter table push_tokens enable row level security;

-- Own-row read/delete for transparency; INSERT/UPDATE go through the admin
-- client so a shared device switching accounts can re-own its token.
drop policy if exists "push_tokens_own" on push_tokens;
create policy "push_tokens_own" on push_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "push_tokens_own_delete" on push_tokens;
create policy "push_tokens_own_delete" on push_tokens
  for delete using (auth.uid() = user_id);

create table if not exists push_sends (
  user_id uuid references auth.users(id) on delete cascade not null,
  kind text not null,
  sent_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, sent_on)
);

-- Service-role only: RLS on, no policies.
alter table push_sends enable row level security;

-- Notification preferences. Opt-in defaults except community (which only
-- fires once community features exist and the user joined one).
alter table user_preferences
  add column if not exists notif_daily_verse boolean not null default false,
  add column if not exists notif_daily_verse_hour smallint not null default 8
    check (notif_daily_verse_hour between 4 and 22),
  add column if not exists notif_streak_reminder boolean not null default false,
  add column if not exists notif_community boolean not null default true;
