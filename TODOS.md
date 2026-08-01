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
- [ ] CI guard: refuse dev→main merge while `supabase/migrations/` is ahead of prod schema
- [ ] Optional single soft bell at sit end (contradicts "no audio in v1" — owner call)
- [ ] Acquisition follow-through: weekly share-funnel + email-growth KPI review
      (queries land with T5)
- [ ] RLS two-user tests for migrations 013/015/016 (ET13) — need a local
      supabase; Docker unavailable this round. The pure-layer half shipped
      (`lib/push-cohort.ts`, `lib/sadhana-core.ts` + 18 tests); the
      DB-policy half runs when Docker is back

Grouped by nearest phase; the full roadmap context lives in `docs/` and the
nonprofit plan. When you pick one up, delete the line in the same PR.

## UI catching up with shipped backends

- [x] Account panel: notification settings (web + mobile prefs UI)
- [x] Account panel: public-profile editor (`/api/profile` + Account panel)
- [ ] Mobile parity (after usage gates, per E7 web-first): chart-aware mood
      ordering toggle, Pressure→Practice card, koota notes via shared i18n,
      panchang Delhi wall-clock (not device time)
- [x] Panchang calendar page (`app/panchang/calendar` week-grouped)
- [x] Themed path UI + `path_runs` (migration 017; `/paths`, `/paths/anxiety-7`)
- [x] Web japa: visual tick + focus-visible ring (+ vibrate when available)

## Phase 3 remainders (design settled in the plan)

- [ ] Moderation queue: Groq triage pass to prioritize the human queue
      (page + `MAINTAINER_USER_IDS` gate shipped; triage never removes,
      only ranks)
- [ ] Circles (sanghas): see [docs/circles-design.md](docs/circles-design.md) —
      frozen until G2+G3+second steward; do not open migration early
- [x] Pressure→Practice as the sādhana verse for chart users (optional
      offer on `/sadhana` mood stage; path-day deep link still wins)
- [ ] Festival email + push reminders (cron clone of votd-email; push kinds
      ride the shipped dispatcher)
- [ ] Named-festival rule table (`data/festivals.json` — lunar month + paksha
      + tithi, computed never hardcoded; needs a cultural reviewer before it
      ships — wrong festival dates are worse than absent ones)

## Known debt

- [x] Astrology path artwork — dedicated `astrology.jpg` + `astrology.svg` icon
      (commissioned photo can still replace later)
- [ ] `/api/astrology/chat` deprecation shim — delete once logs go quiet
      (`docs/t6a-behaviour-deltas.md`)
- [ ] `ChartHub.tsx` (~73 KB) split
- [ ] Incognito charts: mood ordering + Milan currently members-only
- [ ] Push receipts polling (v1 only handles `DeviceNotRegistered` tickets)
- [ ] VOTD email: nakshatra provenance line + community channel links in the
      footer once channels exist (`lib/votd-email.ts`)

## Owner-gated (see docs/nonprofit-kickoff.md + docs/dev-soak.md)

- [x] DNS CNAME for `mind-dev.logitslab.com` (live 2026-08-01)
- [x] Kill-switch defaults documented in `.env.example` (set false on Preview)
- [x] Apply migration **017** to MindKshetra-dev (`path_runs` — 2026-08-01)
- [ ] Set NEXT_PUBLIC_GITHUB_SPONSORS_URL / OPEN_COLLECTIVE / RAZORPAY /
      WHATSAPP / TELEGRAM env vars as accounts come online (Preview first)
- [ ] GitHub secret CRON_SECRET for the push-dispatch workflow
- [x] Mobile push client scaffold (expo-notifications); APNs/FCM still needed
      in EAS before a push-capable store build
- [ ] **Promote deferred** — no `dev`→`main` until soak signed off in
      [docs/dev-soak.md](docs/dev-soak.md)
