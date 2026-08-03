-- Notification backbone v2 (plan Track C, Phase C-1).
--
-- Three service-role-only tables behind /api/account/push-tokens,
-- /api/account/notification-preferences and /api/cron/notify-dispatch.
-- The v1 tables from 012_push.sql (push_tokens, push_sends, notif_* columns
-- on user_preferences) stay untouched while clients migrate; the dispatcher
-- for THIS schema is /api/cron/notify-dispatch.
--
-- Apply manually in the Supabase SQL editor. Idempotent: safe to re-run.

-- Device registry. user_id is NULLABLE: a device may register before anyone
-- signs in; the upsert on expo_push_token re-homes a shared device when the
-- account switches. RLS on with no policies — service-role access only.
create table if not exists device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  expo_push_token text unique not null,
  platform text check (platform in ('ios', 'android')),
  app_version text,
  last_seen_at timestamptz not null default now(),
  failure_count int not null default 0,
  disabled_at timestamptz
);

create index if not exists device_push_tokens_user_idx
  on device_push_tokens (user_id);

alter table device_push_tokens enable row level security;

-- Per-user notification preferences (push categories + send hour). Email
-- opt-out for the VOTD broadcast stays on user_preferences.votd_email_enabled.
create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  daily_verse boolean not null default true,
  streak_reminder boolean not null default true,
  continue_reading boolean not null default false,
  astrology_alerts boolean not null default false,
  reflections boolean not null default false,
  weekly_digest_email boolean not null default false,
  send_hour_local int not null default 8
    check (send_hour_local between 4 and 21),
  updated_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

-- Claim-then-send ledger. UNIQUE(user_id, channel, dedupe_key) is the
-- idempotency gate: the dispatcher INSERTs ON CONFLICT DO NOTHING and only
-- the rows it actually claimed get sent, so overlapping or restarted runs
-- can never double-send. user_id is NOT NULL so the unique key is meaningful
-- (NULLs never conflict in Postgres unique constraints).
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text check (channel in ('push', 'email')),
  category text,
  dedupe_key text not null,
  status text check (status in ('pending', 'sent', 'failed'))
    default 'pending',
  attempts int default 0,
  expo_ticket_id text,
  expo_receipt_status text,
  resend_id text,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, channel, dedupe_key)
);

create index if not exists notification_log_status_created_idx
  on notification_log (status, created_at);

alter table notification_log enable row level security;
