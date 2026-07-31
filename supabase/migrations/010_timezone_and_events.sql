-- Timezone-aware streaks + first-party event sink.
--
-- user_preferences.timezone: IANA zone (e.g. 'Asia/Kolkata'). The streak day
-- boundary becomes the user's local midnight instead of UTC; users without a
-- stored zone fall back to 'Asia/Kolkata' in lib/streaks.ts.
--
-- user_streaks.grace_used_on: reserved for the "rest day" mechanic — a gap of
-- exactly two local days consumes one grace instead of resetting the streak.
-- The column lands now so the one-time day-boundary shift from the timezone
-- change is absorbed by grace days when the mechanic ships.

alter table user_preferences
  add column if not exists timezone text;

alter table user_streaks
  add column if not exists grace_used_on date;

-- Minimal first-party analytics: named events, no IP, no user agent.
-- user_id is nullable so anonymous/no-consent events can still count.
-- RLS is enabled with no policies: only the service role (POST /api/events)
-- can write, and nothing client-side can read.
create table if not exists app_events (
  id bigserial primary key,
  user_id uuid,
  name text not null,
  props jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_events_name_idx
  on app_events (name, created_at desc);

alter table app_events enable row level security;
