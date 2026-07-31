# TODOS

Deferred work, so it exists outside anyone's head.

## From the 2026-07-31 /autoplan review round (dev @ f59f0a2)

Fix-now tasks live in `~/.gstack/projects/LogitsLab-MindKshetra/tasks-*-20260731*.jsonl`
(CEO T1–T12, Design DT1–DT11, Eng ET1–ET13). Deferred here:

- [ ] Launch gates are policy now: circles/festival-reminders/push-broadcasts stay
      dark until G1 (≥100 distinct users with ≥1 `sadhana_logged`/week, 2 consecutive
      weeks), G2 (≥25 distinct `sangha_attended` users/week, 4 consecutive weeks), and
      G3 (safety spine: DPDP disclosure + grievance contact + safeguarding/age posture
      + clinician-reviewed crisis copy) — record gate calls in the CEO plan doc
- [ ] Second named steward is a prerequisite for in-app circles (review monthly)
- [ ] Streak columns are directly writable via PostgREST (cosmetic today) — move
      streak advancement behind service-role before "practiced today" presence ships
- [ ] Month-calendar single-flight/precompute (cold-cache stampede on the 1st at 10x)
- [ ] Push receipts polling; prefs-scan keyset pagination is ET8, receipts still open
- [ ] CI guard: refuse dev→main merge while `supabase/migrations/` is ahead of prod schema
- [ ] Optional single soft bell at sit end (contradicts "no audio in v1" — owner call)
- [ ] Acquisition follow-through: weekly share-funnel + email-growth KPI review
      (queries land with T5) Grouped by nearest phase;
the full roadmap context lives in `docs/` and the nonprofit plan. When you
pick one up, delete the line in the same PR.

## UI catching up with shipped backends

- [ ] Account panel: notification settings (the 4 `notif*` preference fields
      exist in `/api/account/preferences`; no web UI yet — mobile is the
      primary surface, web parity when convenient)
- [ ] Account panel: public-profile editor (API `/api/profile` is live,
      `/u/[handle]` renders; `AccountPageClient.tsx` needs the opt-in panel
      with a "what becomes visible" explainer)
- [ ] Mood page: optional chart-aware ordering (POST `/api/moods/order` is
      live and fail-soft; needs the visible toggle + provenance line on
      web `app/mood/page.tsx` and mobile)
- [ ] Panchang calendar page (month API `/api/panchang/calendar` is live;
      needs `app/panchang/calendar/page.tsx` grouped-by-week list)
- [ ] Themed path UI ("Seven days with anxiety" — `data/paths/anxiety-7.json`
      is complete EN+HI; needs a simple day-list surface + `path_runs`
      progress, resolve verses via `getSlokaByRef`)
- [ ] Web japa: bead haptic equivalent (subtle audio/visual tick) and a
      keyboard-focus ring pass

## Phase 3 remainders (design settled in the plan)

- [ ] Shared reflections: `journal_entries.visibility` migration + share
      toggle + per-verse "Reflections from seekers" (moderation stack and
      crisis-hold contract are already in place — reuse `screenText`)
- [ ] Admin moderation queue page (`/app/admin/moderation`) + `MAINTAINER_USER_IDS`
      gate + Groq triage pass (queue schema shipped in migration 014)
- [ ] Circles (sanghas): migration with `SECURITY DEFINER is_circle_member()`
      + two-user RLS tests — the first migration where a policy bug leaks
      private content; do not rush it
- [ ] Pressure→Practice cards: extend `lib/bridge/` chart→verse into
      fact → teaching → one small action; chart-verify guard already exists
- [ ] Festival email + push reminders (cron clone of votd-email; push kinds
      ride the shipped dispatcher)
- [ ] Named-festival rule table (`data/festivals.json` — lunar month + paksha
      + tithi, computed never hardcoded; needs a cultural reviewer before it
      ships — wrong festival dates are worse than absent ones)

## Known debt

- [ ] Astrology path artwork still reuses Explore's image
      (`components/HomePageClient.tsx` PATHS; no asset exists in
      `public/images/paths/`)
- [ ] `/api/astrology/chat` deprecation shim — delete once logs go quiet
      (`docs/t6a-behaviour-deltas.md`)
- [ ] `ChartHub.tsx` (~73 KB) split
- [ ] Incognito charts: mood ordering + Milan currently members-only
- [ ] Push receipts polling (v1 only handles `DeviceNotRegistered` tickets)
- [ ] VOTD email: nakshatra provenance line + community channel links in the
      footer once channels exist (`lib/votd-email.ts`)

## Owner-gated (see docs/nonprofit-kickoff.md)

- [ ] Apply migrations 011–014 (`npx supabase db push`)
- [ ] Vercel: dev-mind.logitslab.com domain + branch env vars
      (docs/dev-environment.md)
- [ ] Set NEXT_PUBLIC_GITHUB_SPONSORS_URL / OPEN_COLLECTIVE / RAZORPAY /
      WHATSAPP / TELEGRAM env vars as accounts come online
- [ ] GitHub secret CRON_SECRET for the push-dispatch workflow
- [ ] APNs/FCM credentials in EAS before mobile v1.2.0 (expo-notifications)
