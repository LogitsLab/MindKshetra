# Runbook — push dispatch

The half-hourly notification tick. GitHub Actions
(`.github/workflows/push-dispatch.yml`, `*/30 * * * *`) curls
`/api/cron/push-dispatch` with the `CRON_SECRET` bearer token; the route
scans opted-in `user_preferences` in keyset pages and, per page, claims a
`push_sends` ledger row, resolves tokens, and sends through Expo.

## Reading a run

Each workflow run logs the route's JSON:

```json
{ "ok": true, "sent": 12, "attempted": 14, "stale": 2, "deduped": 0,
  "cohorts": { "daily_verse": 10, "streak_reminder": 4 } }
```

- `sent` / `attempted` — Expo accepted vs messages built. A persistent gap
  means Expo-side errors; check the workflow log for `[push]` lines.
- `stale` — tokens Expo reported `DeviceNotRegistered`; they are disabled
  automatically. A spike after an app update is normal.
- `deduped` — candidates whose ledger row already existed (a rerun or an
  overlapping tick). Nonzero is safe by design — the ledger's
  `(user_id, kind, sent_on)` key is the idempotency guarantee.
- `{ sent: 0 }` all day is normal until mobile ships expo-notifications
  and people opt in.

## Failure modes

| Symptom | Meaning | Action |
|---|---|---|
| Workflow red, `curl: (22) ... 401` | `CRON_SECRET` repo secret ≠ Vercel env | Re-sync both sides, re-run manually |
| Workflow red, timeout | Route exceeded 90s (`maxDuration` 60) | Rerun — per-page ledger means at most the in-flight page's sends are burned as `deduped`; check page count vs `MAX_PAGES` in the route |
| `[push-dispatch] hit the 20-page scan ceiling` in logs | >20k opted-in rows in one tick | Raise `MAX_PAGES` / lower tick interval — a deliberate change, not a hotfix |
| A user reports a missed morning verse | One-day silent miss is accepted (no retry queue by decision) | Verify their `push_sends` row absent for the day, then check that tick's run log |
| Notifications stopped entirely for weeks | See scheduled-workflow disable below | Re-enable in the Actions tab |

Manual tick (safe to run any time — the ledger dedupes):

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://mind.logitslab.com/api/cron/push-dispatch
```

## Heartbeat

The impact query in [docs/impact-metrics.md](../impact-metrics.md) ("Push
dispatch heartbeat") shows sends per day from the ledger. Zero rows for a
day with opted-in users = the tick did not run — check the Actions tab
before debugging the route.

## APNs / FCM credentials (EAS — required for real devices)

Code path is ready: `expo-notifications` plugin in `app.json`,
`src/notifications/registerPush.ts`, Account prefs, and this dispatcher.
Tokens will not leave Expo Go / simulators until credentials exist.

### One-time setup (owner)

1. **Apple (APNs):** Apple Developer → Keys → Apple Push Notifications service
   (Key). Download `.p8` once. In EAS:
   `eas credentials` → iOS → Push Key → upload Key ID + Team ID + `.p8`.
2. **Google (FCM):** Firebase project for `app.mindkshetra.mobile` → Cloud
   Messaging → service account / FCM V1. In EAS:
   `eas credentials` → Android → Google Service Account / FCM.
3. Rebuild with EAS (`preview` or `dev-backend` profile) — credentials attach
   at build time; OTA alone is not enough for first push enablement.
4. On a TestFlight / internal APK: sign in → Account → enable dawn verse and/or
   streak → confirm a row in `push_tokens` (Supabase) and a later
   `push_sends` ledger row after a dispatch tick.

### Verify dawn / streak against prefs

| Pref | Kind | Expect |
|---|---|---|
| `notifDailyVerse` + hour | `daily_verse` | Send in that local hour window |
| `notifStreakReminder` | `streak_reminder` | Only when streak at risk per dispatcher rules |
| Off / no token | — | No send; ledger not claimed |

Manual tick against **dev-mind** (after `CRON_SECRET` matches):

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://dev-mind.logitslab.com/api/cron/push-dispatch
```

## GitHub disables schedules on quiet repos

GitHub **disables scheduled workflows after 60 days without repository
activity** and only emails the owner once. A repo receiving regular commits
never hits this; if development pauses, either push any commit inside the
window or re-enable the workflow manually (Actions → Push dispatch →
Enable). Treat a "notifications quietly stopped" report as this until
proven otherwise — it is the most likely total-outage cause.
