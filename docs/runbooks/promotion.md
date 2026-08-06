# Runbook — promoting dev to production

## Current prod watermark (2026-08-06)

Production Supabase **MindKshetra-prod** (`bpxszivjvexmqznnshlx`,
mind.logitslab.com) is through **022** on the new MindKshetra org (clean
cutover — see `docs/runbooks/supabase-org-migration.md`). Web `main` is at
**v2.1.0** (auth callback + native OAuth return).

| Migration | Status on prod |
|---|---|
| 001–015, 017–020 | Applied (practice, push v1/v2, journeys, etc.) |
| 016 | Applied (UGC write enforcement; authenticated has no UPDATE on `journal_entries`) |
| 021 | Applied (personalization prefs, journal `kind`, achievements catalog — 16 rows) |
| 022 | Applied (authenticated INSERT includes `kind`) |

Community kill switches stay dark (unset on Vercel Production). See ROADMAP.md.

---

## Order for a cold promote (prod still ~010)

Migrations 011–015 and 017+ only CREATE things. Old code cannot see a table
it never references, so applying them to a live database is invisible to the
people currently using the site. **016 is the exception**: it revokes
`journal_entries` write grants and moves the moderation boundary into the
database. Applied while old code is still serving, it silently breaks journal
sharing. So it lands last, after the new code is live.

**022 must re-run after any apply of 016** — 016 rewrites the insert column
list to `(user_id, sloka_id, reflection)` without `kind`.

| # | Step | Reversible? |
|---|---|---|
| 0 | Verify watermark (SQL below) — choose light vs full path | — |
| 1 | Additive migrations on prod (`--skip 016`, includes 021–022) | Tables are additive; drop to undo |
| 2 | Merge `dev` → `main`, CI deploys the web app | Yes — revert the merge, redeploy |
| 3 | Verify production health (below) | — |
| 4 | Migration 016 on prod, then **re-apply 022** | Yes — rollback SQL is in 016 header |
| 5 | Mobile: version bump on `main`, EAS build → internal testers | Yes, until you promote the build |

Never run 016 before step 3 succeeds.

### Verify watermark (always first)

```sql
select
  to_regclass('public.sadhana_sessions')      as m011,
  to_regclass('public.device_push_tokens')    as m020,
  to_regclass('public.notification_log')      as m020b,
  to_regclass('public.achievements')          as m021;

select column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'journal_entries'
  and grantee = 'authenticated'
  and privilege_type = 'INSERT'
order by column_name;
```

- Through 020, no 021 → **light path**: `--only 021` then `--only 022`, merge.
- Missing 011+ → **full path**: step 1 with `--skip 016`.
- After any 016 apply → always `--only 022`.

## 1 — Additive migrations

```bash
node scripts/apply-migrations.cjs bpxszivjvexmqznnshlx --skip 016
```

`--skip 016` is the whole point of this step: the runner re-applies every file
in order, and without selection it would land 016 here — which this runbook
forbids until step 4. 001–010 converge (they were made re-runnable) and the
additive ones create their tables (including 021–022 when present).

Expect "0 failed". Anything else: stop, read the error, do not merge.

**Do not use `supabase db push`** — numbered `001_` files are ignored by the CLI.

## 2 — Merge and deploy

```bash
git checkout main && git pull && git merge dev --no-ff && git push origin main
```

Resolve `package.json` / lockfile version conflicts toward `dev` when shipping
a deliberate major (e.g. 2.0.0). `deploy.yml` builds and deploys to Vercel
production on push. It uploads with `--archive=tgz`; without that the free
tier's daily file quota kills the deploy. `vercel.json` disables Vercel's own
git builds for `main` so only GH Actions deploys prod.

## 3 — Verify production

```bash
curl -s https://mind.logitslab.com/api/astrology/health | jq .ephemeris.mode
# MUST be "swiss". "moshier" means the ephemeris files were not traced into
# the lambda and every chart is quietly wrong. This is the repo's own
# documented trap; a build check cannot catch it.

curl -s -o /dev/null -w "%{http_code}\n" https://mind.logitslab.com/
curl -s https://mind.logitslab.com/api/journeys | jq '.journeys | length'   # 7
curl -s -o /dev/null -w "%{http_code}\n" https://mind.logitslab.com/paths/gita-21
curl -s -o /dev/null -w "%{http_code}\n" https://mind.logitslab.com/api/astrology/muhurat
```

Then sign in and walk: personalize prefs → achievements → journal with
`kind` (gratitude/insight) → one journey day → done screen. If journal inserts
fail with a column privilege error, 022 is missing (or 016 was re-applied
without 022).

## 4 — Migration 016 (full path only)

Only after step 3 is clean, and only if 016 was skipped in step 1:

```bash
node scripts/apply-migrations.cjs bpxszivjvexmqznnshlx --only 016
node scripts/apply-migrations.cjs bpxszivjvexmqznnshlx --only 022
```

Then confirm the boundary actually moved: as a signed-in user, a direct
PostgREST `PATCH` to `journal_entries` setting `visibility='shared'` must be
refused. If it succeeds, 016 did not apply and the moderation screen is
bypassable. Confirm insert grants still include `kind` after 022.

## 5 — Mobile

Merging `dev` → `main` alone ships nothing: `eas-release.yml` only auto-releases
when `app.json`'s marketing version changes. To release:

```bash
# in MindKshetra-app
git checkout main && git merge dev --no-ff
# bump expo.version in app.json, commit, push
```

Ship to internal testers first (TestFlight / Play internal), then promote.

**Before any store submission:** confirm no donate UI or link is reachable in
the binary (Apple forbids fundraising for non-approved nonprofits; Play has
flagged it too) and that notifications remain opt-in.

## Rollback

- **Web code:** revert the merge commit on `main` and push; CI redeploys.
- **016:** rollback SQL is in the migration header.
- **Additive tables (021+):** leaving them in place is harmless — old code
  ignores them. Only drop if you are abandoning the feature set.
- **Mobile:** an internal build is never automatically public; simply do not
  promote it.

## What the 2026-08-05 Design v3 promote carried

Immersive companion Home, Account personalize / progress / achievements,
journal kinds, muhurat API, meditation audio polish, migration 021–022, and
`vercel.json` disabling Vercel git builds for `main`. Prior promote already
carried practice/journeys/push/UGC (011–020).

Community surfaces stay dark behind their kill switches and launch gates —
promotion does not open them. See ROADMAP.md.
