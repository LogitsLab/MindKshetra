-- MindKshetra reading progress (verse completions + resume cursor)

create table if not exists reading_cursor (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_sloka_id integer references slokas(id) on delete set null,
  last_chapter smallint,
  updated_at timestamptz default now()
);

create table if not exists verse_completions (
  user_id uuid references auth.users(id) on delete cascade not null,
  sloka_id integer references slokas(id) on delete cascade not null,
  completed_at timestamptz default now(),
  primary key (user_id, sloka_id)
);

create index if not exists verse_completions_user_idx
  on verse_completions (user_id, completed_at desc);

alter table reading_cursor enable row level security;
alter table verse_completions enable row level security;

drop policy if exists "reading_cursor_own" on reading_cursor;
create policy "reading_cursor_own" on reading_cursor
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "verse_completions_own" on verse_completions;
create policy "verse_completions_own" on verse_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
