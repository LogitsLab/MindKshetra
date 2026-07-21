-- MindKshetra v2.1 chat persistence

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists chat_messages (
  id bigserial primary key,
  session_id uuid references chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  cited_sloka_ids integer[] default '{}',
  created_at timestamptz default now()
);

create index if not exists chat_messages_session_idx on chat_messages(session_id, created_at);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- Anonymous sessions: anyone with session id can read/write (client holds uuid)
create policy "chat_sessions_anon_all" on chat_sessions
  for all using (true) with check (true);

create policy "chat_messages_anon_all" on chat_messages
  for all using (true) with check (true);

-- v2.2 will tighten RLS when user_id is set
