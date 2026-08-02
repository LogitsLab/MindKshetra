# Runbook — promoting dev to production

The first full promotion of the nonprofit program: 82 commits, 248 files,
9 unapplied migrations. Production (`rqknmgzdzjpxepjmbzvb`, mind.logitslab.com)
sits at migration 010 and has none of the new tables. Written so the sequence
is executed, not improvised — and so the next promotion is boring.

## Order, and why it is this order

Migrations 011–015 and 017–019 only CREATE things. Old code cannot see a table
it never references, so applying them to a live database is invisible to the
people currently using the site. **016 is the exception**: it revokes
`journal_entries` write grants and moves the moderation boundary into the
database. Applied while old code is still serving, it silently breaks journal
sharing. So it lands last, after the new code is live.

| # | Step | Reversible? |
|---|---|---|
| 1 | Additive migrations (011–015, 017, 018, 019) on prod | Tables are additive; drop to undo |
| 2 | Merge `dev` → `main`, CI deploys the web app | Yes — revert the merge, redeploy |
| 3 | Verify production health (below) | — |
| 4 | Migration 016 on prod | Yes — rollback SQL is in the file header |
| 5 | Mobile: version bump on `main`, EAS build → internal testers | Yes, until you promote the build |

Never run 016 before step 3 succeeds.

## 1 — Additive migrations

```bash
node scripts/apply-migrations.cjs rqknmgzdzjpxepjmbzvb --skip 016
```

`--skip 016` is the whole point of this step: the runner re-applies every file
in order, and without selection it would land 016 here — which this runbook
forbids until step 4. 001–010 converge (they were made re-runnable) and the
additive ones create their tables. 019 is a no-op on a
database that has neither `path_runs` nor `meditation_runs` (its `to_regclass`
guards skip the backfill), and it is safe to re-run afterwards once those
tables exist.

Expect "0 failed". Anything else: stop, read the error, do not merge.

## 2 — Merge and deploy

```bash
git checkout main && git pull && git merge dev --no-ff && git push origin main
```

`deploy.yml` builds and deploys to Vercel production on push. It uploads with
`--archive=tgz`; without that the free tier's daily file quota kills the
deploy (it killed three dev deploys before the fix).

## 3 — Verify production

```bash
curl -s https://mind.logitslab.com/api/astrology/health | jq .ephemeris.mode
# MUST be "swiss". "moshier" means the ephemeris files were not traced into
# the lambda and every chart is quietly wrong. This is the repo's own
# documented trap; a build check cannot catch it.

curl -s -o /dev/null -w "%{http_code}\n" https://mind.logitslab.com/
curl -s https://mind.logitslab.com/api/journeys | jq '.journeys | length'   # 8
curl -s -o /dev/null -w "%{http_code}\n" https://mind.logitslab.com/paths/gita-21
```

Then sign in and walk one loop: begin a journey day → sādhana → the day marks
→ the done screen offers tomorrow. If any of that 500s, the additive
migrations did not land.

## 4 — Migration 016

Only after step 3 is clean:

```bash
node scripts/apply-migrations.cjs rqknmgzdzjpxepjmbzvb --only 016
```

Then confirm the boundary actually moved: as a signed-in user, a direct
PostgREST `PATCH` to `journal_entries` setting `visibility='shared'` must be
refused. If it succeeds, 016 did not apply and the moderation screen is
bypassable.

## 5 — Mobile

Merging `dev` → `main` alone ships nothing: `eas-release.yml` only auto-releases
when `app.json`'s marketing version changes. To release:

```bash
# in MindKshetra-app
git checkout main && git merge dev --no-ff
# bump expo.version in app.json, commit, push
```

A fresh native build is REQUIRED this cycle — `expo-apple-authentication` was
removed, which changes the native project. Ship to internal testers first
(TestFlight / Play internal), verify sign-in still works without the Apple
button, then promote to the public track.

**Before any store submission:** confirm no donate UI or link is reachable in
the binary (Apple forbids fundraising for non-approved nonprofits; Play has
flagged it too) and that notifications remain opt-in.

## Rollback

- **Web code:** revert the merge commit on `main` and push; CI redeploys.
- **016:** rollback SQL is in the migration header.
- **Additive tables:** leaving them in place is harmless — old code ignores
  them. Only drop if you are abandoning the feature set.
- **Mobile:** an internal build is never automatically public; simply do not
  promote it.

## What this promotion carries

Practice layer (sādhana, japa, streaks with grace days), the unified journeys
engine (5 themed weeks + a 21-day Gita arc + the sitting course), panchang and
festivals, Kundli Milan, the Pressure→Practice card, quiet milestones, shared
reflections with moderation and a crisis-hold path, public profiles, push
infrastructure, the dāna page, and the craft pass (Devanagari typesetting,
per-verse share cards, error boundaries, accessibility).

Community surfaces stay dark behind their kill switches and launch gates —
promotion does not open them. See ROADMAP.md.
