-- Moderation stack (plan Phase 3): report queue, user blocks, audit log.
-- Lands ahead of the first UGC surface so no shared content ever ships
-- without report/block/review in place.
--
-- content_id is text (not uuid): journal_entries uses bigserial ids while
-- future circle posts use uuids — the queue is polymorphic across both.

create table if not exists moderation_queue (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('reflection', 'profile', 'circle_post')),
  content_id text not null,
  reported_by uuid references auth.users(id) on delete set null,
  reason text check (reason is null or char_length(reason) <= 500),
  source text not null default 'report' check (source in ('report', 'screen_hold', 'llm_triage')),
  llm_suggestion text check (llm_suggestion is null or llm_suggestion in ('ok', 'spam', 'abuse', 'crisis', 'off_topic')),
  llm_confidence real check (llm_confidence is null or (llm_confidence >= 0 and llm_confidence <= 1)),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolution text check (resolution is null or resolution in ('kept', 'removed', 'no_action')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists moderation_queue_open_idx
  on moderation_queue (status, created_at desc);

create table if not exists user_blocks (
  user_id uuid references auth.users(id) on delete cascade not null,
  blocked_user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);

create table if not exists moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor uuid references auth.users(id) on delete set null,
  action text not null,
  content_type text,
  content_id text,
  note text,
  created_at timestamptz not null default now()
);

-- Queue + audit log: service-role only (RLS on, no policies).
alter table moderation_queue enable row level security;
alter table moderation_actions enable row level security;

-- Blocks are the user's own data.
alter table user_blocks enable row level security;
drop policy if exists "user_blocks_own" on user_blocks;
create policy "user_blocks_own" on user_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
