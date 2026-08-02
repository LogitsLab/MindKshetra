# Dev soak — no prod promote yet

Everything in the next phase soaks on **MindKshetra-dev** and
**https://mind-dev.logitslab.com**. Do not merge `dev` → `main` or apply
migrations 011–016 to prod until the owner signs the checklist at the bottom.

## Environment readiness

- [x] DNS: `mind-dev.logitslab.com` → Vercel (verified 2026-08-01).
- [ ] Preview / `dev` branch env: kill switches **dark**
  - `COMMUNITY_REFLECTIONS_ENABLED=false`
  - `COMMUNITY_REPORTS_ENABLED=false`
  (Unset means *live* — do not leave unset on shared Preview.)
- [ ] `CRON_SECRET` set in GitHub Actions secrets (matches Vercel Preview if
      you tick push-dispatch against mind-dev).
- [ ] Schema on MindKshetra-dev through **018** (`npm run db:migrate -- <dev-ref>`).
- [ ] Mobile uses `EXPO_PUBLIC_API_URL=https://mind-dev.logitslab.com` or the
      EAS `dev-backend` profile.

## Manual smoke (web on mind-dev + Expo → dev API)

Record pass/fail with date below.

| Check | Pass? | Notes |
|---|---|---|
| `GET /api/astrology/health` — Swiss ephemeris ok | ✅ | `ephemeris.mode = "swiss"` on mind-dev, 2026-08-02. Also traced `/api/chat` this round — it dynamically imports the astrology engine and was computing chart-linked Madhav replies under Moshier while the astrology pages used Swiss. |
| Birth chart + Pressure→Practice card for a saved member | ⏳ | Needs a signed-in account with a cast chart — owner check. Route responds 401 signed-out as designed. |
| Daily Sādhana: mood → verse → sit → journal; `sadhana_logged` in `app_events` | ⏳ | Owner check (needs a session). Flow verified locally end-to-end on the production build. |
| Japa finish + grace-day streak behaviour | ⏳ | Owner check. Grace math covered by 11 unit tests; the sit-timer double-count bug was fixed this round (it logged every sit at ~2× its real length). |
| Panchang day (timezone sensible for chosen place) | ✅ | `/panchang` 200, `/panchang/calendar` 200; day resolves at local sunrise, header states "New Delhi · IST". |
| Milan with ≥2 members; Hindi koota notes readable | ✅ | `/astrology/milan` 200; koota notes now come from shared i18n on both clients (mobile was rendering the server's English). |
| Community share while kill-switched → 503; unshare still works | ✅ | The row that earned its keep. Server returns 503 when paused — but the client still offered "Share with seekers" and "be the first to reflect", so people were invited into a refusal. Fixed: kill switches now default to PAUSED when unset (a gate you must remember to close is not a gate) and a public mirror hides the affordance. |
| Guest sādhana → sign-in merge | ✅ | Verified `POST /api/journeys/merge` rejects signed-out with 401. Two real bugs fixed here: journeys had no merge caller at all (a guest's week died on the device), and the merge I first added fired for anonymous sessions and cleared the device copy — erasing visible progress. |
| `/sangha` "I attended" → `sangha_attended` event | ✅ | `/community` 200 (renamed; `/sangha` 308-redirects). Event name deliberately unchanged — the G2 gate query binds to it. |
| Account: notification prefs PATCH; public profile PUT → `/u/[handle]` | ⏳ | Owner check (needs a session). |
| `/paths/anxiety-7` day list + verse links | ✅ | 200. Deep link carries the full contract: `slokaId`, `pathId`, `pathDay`, `pathTotal`, `minutes`. Unknown journey 404s; guest run returns `{guest:true}`. |
| `/meditation` Day 1 mood → TTS/silence → complete | ✅ | `/meditation` and `/meditation/1` 200. Unlock is now enforced server-side — the course gated only in the client, so a crafted request could complete day 7 on day one. |
| `/panchang/calendar` month list loads | ✅ | 200. |

**Automated pass, 2026-08-02.** ✅ = verified against mind-dev.logitslab.com or
the production build. ⏳ = needs a signed-in session; left for the owner rather
than marked passed on assumption.

## Eng re-review notes

Date: 2026-08-01  Reviewer: Auto (agent) — automated soak pass

- [x] Unit tests: 188/188 web vitest green; mobile jest green after push client
- [x] `tsc --noEmit` clean on web
- [x] Kill-switch defaults set false in `.env.example` and local `.env.local`
- [x] Migration 017 (`path_runs`) applied to MindKshetra-dev (011–016 already present; 002 policy exists noisily)
- [x] No Calm / open-feed / AstroTalk-shaped scope in this change set
- [ ] Manual browser smoke on https://mind-dev.logitslab.com — **owner** (DNS + Preview deploy); use table above

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
| 2026-08-01 | baseline — run after first live week | baseline | miss (habit started) |

## Deferred promote checklist (owner sign-off required)

Do **not** start until soak is declared done:

1. Set prod kill switches dark before traffic.
2. Deploy current app code to production, then
   `npm run db:migrate -- <prod-ref>` for 011 → **017** (016: code before SQL;
   017 `path_runs` after soak on dev).
3. PR `dev` → `main` (web; mobile when store-ready).
4. Prod smoke (same table as above).
5. Optional follow-up: CI guard refusing merge while migrations ahead of prod.

**Promote status:** cleared to promote, 2026-08-02 — owner decision, after
three independent pre-promotion reviews found twelve defects and all twelve
were fixed (see the promotion runbook). The ⏳ rows above need a signed-in
session and remain the owner's to walk after promotion.

The original rule stands for next time: executing this checklist early is a
strategy regression. It earned its keep here — the "community share while
kill-switched" row is exactly the defect that would otherwise have shipped.
