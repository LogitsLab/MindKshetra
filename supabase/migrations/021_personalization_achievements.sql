-- Personalization (onboarding) + achievements + journal kinds
-- MindKshetra web + app shared schema

-- ---------------------------------------------------------------------------
-- user_preferences: onboarding / personalization fields
-- ---------------------------------------------------------------------------
alter table user_preferences
  add column if not exists goals text[] not null default '{}';

alter table user_preferences
  add column if not exists inspirations text[] not null default '{}';

alter table user_preferences
  add column if not exists daily_time_minutes integer
    check (
      daily_time_minutes is null
      or daily_time_minutes in (5, 10, 20, 30, 60)
    );

alter table user_preferences
  add column if not exists guidance_style text
    check (
      guidance_style is null
      or guidance_style in ('balanced', 'gita_first', 'practice_first')
    );

alter table user_preferences
  add column if not exists onboarding_version integer not null default 0;

alter table user_preferences
  add column if not exists onboarding_completed_at timestamptz;

alter table user_preferences
  add column if not exists onboarding_skipped boolean not null default false;

-- ---------------------------------------------------------------------------
-- journal_entries: kinds beyond verse reflections
-- ---------------------------------------------------------------------------
alter table journal_entries
  add column if not exists kind text not null default 'verse'
    check (kind in ('verse', 'reflection', 'gratitude', 'insight'));

alter table journal_entries
  alter column sloka_id drop not null;

create index if not exists journal_entries_user_kind_idx
  on journal_entries (user_id, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- achievements catalog + user unlocks
-- ---------------------------------------------------------------------------
create table if not exists achievements (
  id text primary key,
  motif text not null default 'lotus',
  name_en text not null,
  name_hi text not null,
  line_en text not null,
  line_hi text not null,
  target integer not null default 1,
  sort_order integer not null default 0
);

create table if not exists user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references achievements(id) on delete cascade,
  progress integer not null default 0,
  unlocked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table user_achievements enable row level security;

drop policy if exists "user_achievements_own" on user_achievements;
create policy "user_achievements_own" on user_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed catalog (idempotent)
insert into achievements (id, motif, name_en, name_hi, line_en, line_hi, target, sort_order) values
  ('streak_7', 'surya', 'Seven days steady', 'सात दिन स्थिर', 'A week of returning.', 'लौटने का एक सप्ताह।', 7, 10),
  ('streak_21', 'patha', 'Twenty-one days', 'इक्कीस दिन', 'Practice becoming habit.', 'अभ्यास स्वभाव बनता हुआ।', 21, 20),
  ('streak_45', 'kalasha', 'Forty-five days', 'पैंतालीस दिन', 'A deep stretch of constancy.', 'निरंतरता का गहरा विस्तार।', 45, 30),
  ('visit_7', 'lotus', 'Week of presence', 'उपस्थिति का सप्ताह', 'Seven visit days.', 'सात दिन आना।', 7, 40),
  ('visit_21', 'wheel', 'Three weeks present', 'तीन सप्ताह उपस्थित', 'Twenty-one visit days.', 'इक्कीस दिन आना।', 21, 50),
  ('visit_108', 'mala', 'A mala of days', 'दिनों की माला', 'One hundred and eight visits.', 'एक सौ आठ आगमन।', 108, 60),
  ('mala_1', 'mala', 'First mala', 'पहली माला', 'One hundred and eight beads.', 'एक सौ आठ मनके।', 1, 70),
  ('mala_11', 'mala', 'Eleven malas', 'ग्यारह मालाएँ', 'Japa gathering strength.', 'जप बल संचित करता।', 11, 80),
  ('meditation_7', 'lotus', 'Foundation sit', 'आधार बैठक', 'Seven meditation days.', 'सात ध्यान दिन।', 7, 90),
  ('meditation_21', 'diya', 'Habit sit', 'स्वाभाविक बैठक', 'Twenty-one meditation days.', 'इक्कीस ध्यान दिन।', 21, 100),
  ('meditation_45', 'kalasha', 'Deepening sit', 'गहन बैठक', 'Forty-five meditation days.', 'पैंतालीस ध्यान दिन।', 45, 110),
  ('path_complete', 'patha', 'Path walked', 'मार्ग पूरा', 'A seven-day journey finished.', 'सात-दिन की यात्रा पूर्ण।', 1, 120),
  ('journal_7', 'conch', 'Seven reflections', 'सात चिंतन', 'A week of honest lines.', 'ईमानदार पंक्तियों का सप्ताह।', 7, 130),
  ('first_chart', 'surya', 'First chart', 'पहली कुंडली', 'A Jyotish chart cast.', 'एक ज्योतिष चार्ट।', 1, 140),
  ('first_madhav', 'peacock', 'First question', 'पहला प्रश्न', 'You asked Madhav.', 'आपने माधव से पूछा।', 1, 150),
  ('verses_108', 'patha', 'One hundred eight verses', 'एक सौ आठ श्लोक', 'A mala of reading.', 'पठन की एक माला।', 108, 160)
on conflict (id) do update set
  motif = excluded.motif,
  name_en = excluded.name_en,
  name_hi = excluded.name_hi,
  line_en = excluded.line_en,
  line_hi = excluded.line_hi,
  target = excluded.target,
  sort_order = excluded.sort_order;
