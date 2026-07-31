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
- **Sādhana completion** — arrives with the `sadhana_sessions` table
  (plan Phase 1); until then `verse_completed` is the nearest proxy.
