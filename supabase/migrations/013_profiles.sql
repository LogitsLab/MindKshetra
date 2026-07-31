-- Public profiles (plan Phase 2) — the base of every social feature.
--
-- Deliberately separate from user_preferences: that table holds private data
-- (date of birth, place) and must never gain a public-read policy. This is
-- the first table with a non-own-row SELECT, so the policy stays as simple
-- as possible: public when the owner says so, own otherwise.
--
-- Pseudonymous by default (handle required, display name optional), no image
-- uploads (avatar is a preset brass-motif key), opt-in only.

create table if not exists public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  bio text check (bio is null or char_length(bio) <= 200),
  avatar_key text not null default 'lotus'
    check (avatar_key in ('lotus', 'conch', 'wheel', 'diya', 'veena', 'peacock')),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public_profiles enable row level security;

drop policy if exists "public_profiles_read" on public_profiles;
create policy "public_profiles_read" on public_profiles
  for select using (is_public or auth.uid() = user_id);

drop policy if exists "public_profiles_write" on public_profiles;
create policy "public_profiles_write" on public_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "public_profiles_update" on public_profiles;
create policy "public_profiles_update" on public_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public_profiles_delete" on public_profiles;
create policy "public_profiles_delete" on public_profiles
  for delete using (auth.uid() = user_id);
