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

## Shares — person-to-person spread

```sql
select
  date_trunc('week', created_at)::date as week,
  props->>'method' as method,
  count(*) as shares
from app_events
where name = 'share_card'
  and created_at > now() - interval '12 weeks'
group by 1, 2
order by 1, 2;
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

## Not yet measurable

- **Crisis redirects handled** — the chat crisis path (`app/api/chat/route.ts`)
  is log-only today; there is no `crisis_redirected` event name in the
  allowlist. Add the name to `lib/events-names.ts` and record it at the crisis
  interception point when the care-path work lands (plan Phase 3). Count it as
  care delivered, never as a growth number.
- ~~**Sādhana completion**~~ — measurable now: `sadhana_sessions` (migration
  011) landed and `sadhana_logged` is in the event allowlist; the G1 launch
  gate above is the canonical query.
