-- MindKshetra v2.2 user features

create table if not exists favorites (
  user_id uuid references auth.users(id) on delete cascade not null,
  sloka_id integer references slokas(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, sloka_id)
);

create table if not exists journal_entries (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  sloka_id integer references slokas(id) on delete cascade not null,
  reflection text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_visit_date date,
  updated_at timestamptz default now()
);

alter table favorites enable row level security;
alter table journal_entries enable row level security;
alter table user_streaks enable row level security;

create policy "favorites_own" on favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "journal_own" on journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "streaks_own" on user_streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tighten chat RLS for authenticated users
drop policy if exists "chat_sessions_anon_all" on chat_sessions;
drop policy if exists "chat_messages_anon_all" on chat_messages;

create policy "chat_sessions_select" on chat_sessions
  for select using (user_id is null or auth.uid() = user_id);

create policy "chat_sessions_insert" on chat_sessions
  for insert with check (user_id is null or auth.uid() = user_id);

create policy "chat_sessions_update" on chat_sessions
  for update using (user_id is null or auth.uid() = user_id);

create policy "chat_messages_select" on chat_messages
  for select using (
    exists (
      select 1 from chat_sessions s
      where s.id = session_id and (s.user_id is null or s.user_id = auth.uid())
    )
  );

create policy "chat_messages_insert" on chat_messages
  for insert with check (
    exists (
      select 1 from chat_sessions s
      where s.id = session_id and (s.user_id is null or s.user_id = auth.uid())
    )
  );
