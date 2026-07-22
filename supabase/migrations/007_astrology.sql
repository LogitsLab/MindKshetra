-- MindKshetra astrology members + chart cache

create table if not exists astrology_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text not null default 'self'
    check (relationship in ('self', 'spouse', 'child', 'friend', 'other')),
  dob date not null,
  tob time,
  tob_unknown boolean not null default false,
  gender text
    check (gender is null or gender in ('male', 'female', 'other', 'unspecified')),
  place_label text not null,
  lat double precision not null,
  lng double precision not null,
  iana_tz text not null,
  utc_offset_minutes integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists astrology_members_user_idx
  on astrology_members (user_id)
  where is_active = true;

create table if not exists astrology_chart_cache (
  id bigserial primary key,
  member_id uuid not null references astrology_members(id) on delete cascade,
  engine_version text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique (member_id, engine_version)
);

alter table astrology_members enable row level security;
alter table astrology_chart_cache enable row level security;

drop policy if exists "astrology_members_own" on astrology_members;
create policy "astrology_members_own" on astrology_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "astrology_chart_cache_own" on astrology_chart_cache;
create policy "astrology_chart_cache_own" on astrology_chart_cache
  for all using (
    exists (
      select 1 from astrology_members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from astrology_members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  );
