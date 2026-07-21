-- MindKshetra v2.3 user preferences + profile

create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  votd_email_enabled boolean not null default true,
  -- Profile (email comes from auth.users)
  display_name text,
  date_of_birth date,
  place text,
  preferred_language text check (
    preferred_language is null or preferred_language in ('en', 'hi')
  ),
  about text,
  updated_at timestamptz default now()
);

alter table user_preferences enable row level security;

drop policy if exists "prefs_own" on user_preferences;
create policy "prefs_own" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
