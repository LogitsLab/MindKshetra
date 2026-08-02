# Impact metrics — canned queries

Run these in the Supabase SQL editor. At the current scale that editor *is* the
dashboard; resist building one.

These measure **impact, not vanity**: does the practice hold (streaks), does it
deepen (journal), does it spread person-to-person (shares)? Downloads and page
views are deliberately absent.

The `app_events` sink (migration 010) stores `user_id`, `name`, small `props`,
`created_at` — no IP, no user agent (see `lib/events.ts`). Server routes record
`verse_completed`, `streak_recorded`, `chart_cast`, and `predictions_viewed`;
clients send `share_card` via `lib/track.ts` (web) and `eventsApi.send`
(mobile).

## Launch gates

The two go/no-go numbers. Each gate passes only when the **latest two full,
consecutive weeks** both clear its bar — read the last two complete rows off
the query output; a single-week spike does not count, and the current partial
week never counts.

### G1 — weekly practitioners (≥1 `sadhana_logged`)

`sadhana_logged` is recorded server-side on every successful practice log
(`app/api/sadhana/route.ts`) — and only on success, so this never counts
sessions the database refused.

```sql
select
  date_trunc('week', created_at)::date as week,
  count(distinct user_id) as practitioners
from app_events
where name = 'sadhana_logged'
  and created_at > now() - interval '8 weeks'
group by 1
order by 1;
```

### G2 — weekly sangha attendance

Distinct users with ≥1 `sangha_attended` per week.

```sql
select
  date_trunc('week', created_at)::date as week,
  count(distinct user_id) as attendees
from app_events
where name = 'sangha_attended'
  and created_at > now() - interval '8 weeks'
group by 1
order by 1;
```

## Push dispatch heartbeat

`push_sends` gets a row per (user, kind, local day) *before* each send, so it
doubles as the dispatcher's pulse:

```sql
select
  sent_on as day,
  kind,
  count(*) as sends
from push_sends
where sent_on > current_date - 14
group by 1, 2
order by 1 desc, 2;
```

Zero rows for >48h while opted-in users exist (`select count(*) from
user_preferences where notif_daily_verse or notif_streak_reminder;`) = the
GitHub cron is dead — check the Actions tab. GitHub disables schedules after
60 days of repo inactivity; see the push dispatch runbook in
`docs/dev-environment.md` for the re-enable steps.

## Daily active practitioners (from streak check-ins)

```sql
select
  date(created_at) as day,
  count(distinct user_id) as active_users
from app_events
where name = 'streak_recorded'
  and created_at > now() - interval '30 days'
group by 1
order by 1;
```

## Streak retention — how many people hold a practice

```sql
select
  count(*) filter (where current_streak >= 2)  as day_2_plus,
  count(*) filter (where current_streak >= 7)  as week_plus,
  count(*) filter (where current_streak >= 21) as three_weeks_plus,
  count(*) filter (where last_visit_date >= current_date - 1) as active_today_or_yesterday,
  count(*) as total_with_streaks
from user_streaks;
```

## Practice completion — verses completed per week

```sql
select
  date_trunc('week', created_at)::date as week,
  count(*) as completions,
  count(distinct user_id) as practitioners,
  round(count(*)::numeric / nullif(count(distinct user_id), 0), 1) as per_practitioner
from app_events
where name = 'verse_completed'
  and created_at > now() - interval '12 weeks'
group by 1
order by 1;
```

## Journal depth — reflections per writer per week

Depth of engagement, straight from the table (predates the event sink).

```sql
select
  date_trunc('week', created_at)::date as week,
  count(*) as entries,
  count(distinct user_id) as writers,
  round(count(*)::numeric / nullif(count(distinct user_id), 0), 1) as entries_per_writer
from journal_entries
where created_at > now() - interval '12 weeks'
group by 1
order by 1;
```

## Acquisition

### a) Weekly share volume (`share_card`)

`share_card` fires from the share buttons on the verse page and the
reflection story (both also rendered on `/verse-of-the-day`). Props:
`method` (`native` | `copy` | `image`), `surface` (`verse` | `story`),
`slokaId`, `path`. Instrumentation shipped 2026-08-01 — earlier weeks are
structurally zero, not "no sharing".

```sql
select
  date_trunc('week', created_at)::date as week,
  count(*)                             as shares,
  count(distinct user_id)              as distinct_signed_in_sharers
from app_events
where name = 'share_card'
group by 1
order by 1 desc;
```

Split by surface and method (signed-out sharers have `user_id is null` and
still count in `shares`):

```sql
select
  date_trunc('week', created_at)::date   as week,
  coalesce(props->>'surface', 'unknown') as surface,
  coalesce(props->>'method',  'unknown') as method,
  count(*)                               as shares
from app_events
where name = 'share_card'
group by 1, 2, 3
order by 1 desc, shares desc;
```

### b) VOTD email opt-in

The email is opt-out: the daily cron (`app/api/cron/votd-email/route.ts`)
sends to every non-anonymous account with an email **except** rows where
`votd_email_enabled = false`. "No prefs row" therefore means subscribed.

Current subscriber reach (matches the cron's recipient rule exactly):

```sql
select
  (select count(*)
     from auth.users u
    where u.email is not null
      and coalesce(u.is_anonymous, false) = false)
  -
  (select count(*)
     from public.user_preferences
    where votd_email_enabled = false) as votd_email_subscribers_now;
```

Weekly series: because the default is subscribed, **new accounts are new
subscribers**, so weekly signups are the honest weekly opt-in count (later
opt-outs are subtracted in the reach figure above):

```sql
select
  date_trunc('week', u.created_at)::date as week,
  count(*) as new_accounts_with_email    -- ≈ new VOTD subscribers
from auth.users u
where u.email is not null
  and coalesce(u.is_anonymous, false) = false
group by 1
order by 1 desc;
```

Opt-out drift — approximate only. `user_preferences` has no per-field
timestamps and `updated_at` moves on any preference change, so this shows
when currently-opted-out rows were *last touched*, not when the opt-out
itself happened:

```sql
select
  date_trunc('week', updated_at)::date           as week,
  count(*) filter (where not votd_email_enabled) as rows_now_opted_out,
  count(*) filter (where votd_email_enabled)     as rows_now_opted_in
from public.user_preferences
group by 1
order by 1 desc;
```

### c) Arrivals from the VOTD email (`ref=votd`)

The email's verse links (`/verse-of-the-day` and `/sloka/[id]`, HTML and
plain-text) carry `?ref=votd` **as of 2026-08-01**; emails sent before that
date had bare links, so nothing can ever be attributed before it.

**Honest limitation: this KPI is not yet measurable from `app_events`.**
Page visits are not recorded anywhere — the allowlist in
`lib/events-names.ts` contains no page-view/arrival event and no code reads
the `ref` query param on landing. The tables have no column that captures
it, so there is no real query for "weekly distinct users arriving with
`ref=votd`" today. Counting it requires a small client beacon that fires an
allowlisted event (e.g. `notif_opened`-style `votd_opened` with
`props->>'ref'`) when a page loads with `ref=votd`; that event name does not
exist yet and would need to be added to `lib/events-names.ts` first.

Once such an event ships, the query is:

```sql
-- DOES NOT RUN TODAY: no arrival event exists yet. Template for when it does.
select
  date_trunc('week', created_at)::date as week,
  count(distinct user_id)              as distinct_signed_in_arrivals,
  count(*)                             as arrivals_incl_signed_out
from app_events
where name = 'votd_opened'          -- placeholder: add to lib/events-names.ts
  and props->>'ref' = 'votd'
group by 1
order by 1 desc;
```

Scoped to what `app_events` actually contains today, the closest available
cut is weekly distinct signed-in users emitting *any* event — an engagement
baseline, **not** email-attributed traffic; do not present it as such:

```sql
select
  date_trunc('week', created_at)::date as week,
  count(distinct user_id) filter (where user_id is not null)
                                       as distinct_signed_in_active,
  count(*)                             as events
from app_events
group by 1
order by 1 desc;
```

## Chart volume — fresh casts by mode

`chart_cast` fires on fresh computes only (not cache reads), so this counts
charts actually cast.

```sql
select
  date_trunc('week', created_at)::date as week,
  props->>'mode' as mode,
  count(*) as casts,
  count(distinct user_id) as users
from app_events
where name = 'chart_cast'
  and created_at > now() - interval '12 weeks'
group by 1, 2
order by 1, 2;
```

## Predictions read — moat engagement

```sql
select
  date_trunc('week', created_at)::date as week,
  props->>'source' as source,   -- 'llm' vs 'rules' fallback
  count(*) as generated
from app_events
where name = 'predictions_viewed'
  and created_at > now() - interval '12 weeks'
group by 1, 2
order by 1, 2;
```

## Meditation course

Event `meditation_completed` (props: `sessionId`, `day`, `moodBefore`, `moodAfter`, `tier`). Completions also write `sadhana_logged` with `practice = meditation` (counts toward G1).

### Weekly course practitioners

```sql
select
  date_trunc('week', created_at)::date as week,
  count(distinct user_id) as course_users
from app_events
where name = 'meditation_completed'
  and created_at > now() - interval '12 weeks'
group by 1
order by 1;
```

### Day 1 → Day 7 funnel (foundation)

```sql
select
  (props->>'day')::int as day,
  count(distinct user_id) as users
from app_events
where name = 'meditation_completed'
  and props->>'tier' = 'foundation'
  and created_at > now() - interval '12 weeks'
group by 1
order by 1;
```

### Day 7 → Day 21 funnel (habit)

```sql
select
  (props->>'day')::int as day,
  count(distinct user_id) as users
from app_events
where name = 'meditation_completed'
  and props->>'tier' = 'habit'
  and created_at > now() - interval '12 weeks'
group by 1
order by 1;
```

### Day 21 → Day 45 funnel (deepening)

```sql
select
  (props->>'day')::int as day,
  count(distinct user_id) as users
from app_events
where name = 'meditation_completed'
  and props->>'tier' = 'deepening'
  and created_at > now() - interval '12 weeks'
group by 1
order by 1;
```

### Private milestones hit

```sql
select
  (props->>'milestone')::int as milestone,
  count(distinct user_id) as users
from app_events
where name = 'meditation_completed'
  and props->>'milestone' is not null
  and created_at > now() - interval '12 weeks'
group by 1
order by 1;
```

### Mean mood delta (after − before)

```sql
select
  round(avg((mood_after - mood_before)::numeric), 2) as mean_delta,
  count(*) as n
from meditation_completions
where mood_before is not null
  and mood_after is not null
  and completed_at > now() - interval '30 days';
```

## Not yet measurable

- **Crisis redirects handled** — the chat crisis path (`app/api/chat/route.ts`)
  is log-only today; there is no `crisis_redirected` event name in the
  allowlist. Add the name to `lib/events-names.ts` and record it at the crisis
  interception point when the care-path work lands (plan Phase 3). Count it as
  care delivered, never as a growth number.
- ~~**Sādhana completion**~~ — measurable now: `sadhana_sessions` (migration
  011) landed and `sadhana_logged` is in the event allowlist; the G1 launch
  gate above is the canonical query.
