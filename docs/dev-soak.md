# Dev soak — no prod promote yet

Everything in the next phase soaks on **MindKshetra-dev** and
**https://dev-mind.logitslab.com**. Do not merge `dev` → `main` or apply
migrations 011–016 to prod until the owner signs the checklist at the bottom.

## Environment readiness

- [ ] DNS: CNAME `dev-mind` → `cname.vercel-dns.com` (Google Cloud DNS /
      domain host). Vercel verifies after propagation.
- [ ] Preview / `dev` branch env: kill switches **dark**
  - `COMMUNITY_REFLECTIONS_ENABLED=false`
  - `COMMUNITY_REPORTS_ENABLED=false`
  (Unset means *live* — do not leave unset on shared Preview.)
- [ ] `CRON_SECRET` set in GitHub Actions secrets (matches Vercel Preview if
      you tick push-dispatch against dev-mind).
- [ ] Schema on MindKshetra-dev through **016** (`npm run db:migrate -- <dev-ref>`).
- [ ] Mobile uses `EXPO_PUBLIC_API_URL=https://dev-mind.logitslab.com` or the
      EAS `dev-backend` profile.

## Manual smoke (web on dev-mind + Expo → dev API)

Record pass/fail with date below.

| Check | Pass? | Notes |
|---|---|---|
| `GET /api/astrology/health` — Swiss ephemeris ok | | |
| Birth chart + Pressure→Practice card for a saved member | | |
| Daily Sādhana: mood → verse → sit → journal; `sadhana_logged` in `app_events` | | |
| Japa finish + grace-day streak behaviour | | |
| Panchang day (timezone sensible for chosen place) | | |
| Milan with ≥2 members; Hindi koota notes readable | | |
| Community share while kill-switched → 503; unshare still works | | |
| Guest sādhana → sign-in merge | | |
| `/sangha` “I attended” → `sangha_attended` event | | |
| Account: notification prefs PATCH; public profile PUT → `/u/[handle]` | | |
| `/paths/anxiety-7` day list + verse links | | |
| `/panchang/calendar` month list loads | | |

## Eng re-review notes

Date: 2026-08-01  Reviewer: Auto (agent) — automated soak pass

- [x] Unit tests: 188/188 web vitest green; mobile jest green after push client
- [x] `tsc --noEmit` clean on web
- [x] Kill-switch defaults set false in `.env.example` and local `.env.local`
- [x] Migration 017 (`path_runs`) applied to MindKshetra-dev (011–016 already present; 002 policy exists noisily)
- [x] No Calm / open-feed / AstroTalk-shaped scope in this change set
- [ ] Manual browser smoke on https://dev-mind.logitslab.com — **owner** (DNS + Preview deploy); use table above

Findings (blockers only on `dev`):

```
002_chat.sql re-apply reports existing policy (expected on soaked DB).
Owner still needs: DNS CNAME if pending, Preview kill switches, CRON_SECRET,
channel/donate URLs, APNs/FCM for real push tokens.
Promote remains deferred.
```

## Gate query habit (MindKshetra-dev SQL editor)

Weekly: run G1 / G2 from [impact-metrics.md](impact-metrics.md). Dated calls:

| Date | G1 practitioners (last 2 full weeks) | G2 attendees | Call |
|---|---|---|---|
| | | | miss / watch / pass |

## Deferred promote checklist (owner sign-off required)

Do **not** start until soak is declared done:

1. Set prod kill switches dark before traffic.
2. Deploy current app code to production, then
   `npm run db:migrate -- <prod-ref>` for 011 → 016 (016: code before SQL).
3. PR `dev` → `main` (web; mobile when store-ready).
4. Prod smoke (same table as above).
5. Optional follow-up: CI guard refusing merge while migrations ahead of prod.

**Promote status:** deferred — soak first.
