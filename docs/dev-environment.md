# Dev environment — branch model and dev-mind.logitslab.com

## Branch model

- **`dev`** — the integration branch, in BOTH repos (web + mobile). All feature
  work merges here. It deploys continuously to
  **https://dev-mind.logitslab.com** via `.github/workflows/deploy-dev.yml`.
- **`main`** — production only. Nothing merges to `main` except an owner-driven
  promotion of `dev` (which triggers the existing production deploy on web and
  the EAS release train on mobile). Day-to-day work never targets it.

## One-time setup (owner, ~15 minutes)

1. **Vercel domain**: ✅ `dev-mind.logitslab.com` is added to the project
   (via CLI, 2026-07-31). The deploy-dev workflow aliases each dev deployment
   to it.
2. **DNS** (still pending): add a CNAME for `dev-mind` →
   `cname.vercel-dns.com` in the `logitslab.com` zone — its nameservers are
   Google (`ns-cloud-a*.googledomains.com`), so the record lives in Google
   Cloud DNS / the domain host's DNS panel. Vercel auto-verifies once it
   propagates.
3. **Branch-scoped env vars** (Vercel → Settings → Environment Variables,
   environment "Preview", branch `dev`) — already set via CLI:
   - `NEXT_PUBLIC_SITE_URL=https://dev-mind.logitslab.com`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the **MindKshetra-dev** publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` — the MindKshetra-dev secret key (sensitive)
   - `NEXT_PUBLIC_SUPABASE_URL` — the MindKshetra-dev project URL
     (`https://<ref>.supabase.co`)
   - Everything else (Groq, Redis, Resend) is inherited from the shared
     Preview environment. Consider leaving `RESEND_API_KEY` unset for the dev
     branch so nothing on dev can send real email.
4. **Vercel cron note**: `vercel.json` crons only run on the production
   deployment — the dev site sends no scheduled emails. That is intentional.

### Push dispatch runbook

Push notifications are NOT Vercel cron: `.github/workflows/push-dispatch.yml`
curls `/api/cron/push-dispatch` every 30 minutes with the `CRON_SECRET`
bearer.

- **GitHub disables scheduled workflows after 60 days of repo inactivity.**
  The failure is silent — no error, just no runs. Watch the heartbeat query
  in `docs/impact-metrics.md`: zero `push_sends` rows for >48h while opted-in
  users exist means the schedule is dead.
- **Re-enable**: repo → Actions → "Push dispatch" → the yellow "This
  scheduled workflow is disabled" banner → **Enable workflow**. Then confirm
  with a manual run: **Run workflow** (the workflow has `workflow_dispatch`).
  Any pushed commit also resets the 60-day clock.
- **Manual tick from a shell** (safe to rerun — `push_sends` makes every tick
  idempotent, so nobody gets double-pinged):

  ```bash
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
    https://mind.logitslab.com/api/cron/push-dispatch
  ```

## Two Supabase projects

- **Prod project** — serves `main` / mind.logitslab.com. Schema moves only at
  promotion time.
- **MindKshetra-dev** — serves the `dev` branch / dev-mind.logitslab.com and
  local development. Fresh migrations land here first and soak.

Content does not live in either database by default (`CONTENT_SOURCE=json`
serves all 701 verses from the repo), so the dev project needs **no seeding**
— only schema.

### Applying migrations

There is **one** migration path:

```bash
npm run db:migrate -- <project-ref>          # e.g. xtadssxgwskyobxmhnxa (MindKshetra-dev)
```

It runs `scripts/apply-migrations.cjs`, which applies every
`supabase/migrations/*.sql` in order via the Supabase Management API (needs a
one-time `npx supabase login`, or `SUPABASE_ACCESS_TOKEN` set).

**Do not use `supabase db push` — it silently applies nothing here.** The
migrations are numbered `001_…`, which the CLI's `<timestamp>_name.sql`
convention ignores, so push reports "up to date" without running a single
file.

No CLI token available? Fallback: paste the SQL into the dashboard SQL editor:

```bash
node scripts/dev-bootstrap-sql.cjs | pbcopy   # then Dashboard → SQL Editor
```

Every migration is idempotent (`if not exists` / `drop policy if exists`),
so re-running either path after new files land is safe. MindKshetra-dev is
bootstrapped through 015 as of 2026-07-31.

### Dev project auth configuration (dashboard, one-time)

Authentication → URL Configuration:

- Site URL: `https://dev-mind.logitslab.com`
- Redirect URLs: `https://dev-mind.logitslab.com/auth/callback`,
  `http://localhost:3000/auth/callback`, `mindkshetra://auth/callback`,
  `exp://127.0.0.1:8081/--/auth/callback`

Authentication → Providers: enable **Anonymous** and **Email** (magic link).
Google/Apple only if those flows need testing on dev — each needs the dev
callback registered with the provider too.

Note: dev has its own user pool. Prod accounts don't exist here — use
throwaway test accounts. That's the point.

## Database migrations

New migrations are **written on `dev` and applied to MindKshetra-dev** as part
of the same change (`npm run db:migrate -- <dev-ref>`). The prod project is
touched only at promotion. Until a migration is applied, its API routes
degrade (empty data or 503) and the UI shows empty states — the site stays
browsable either way.

## Mobile against the dev backend

`eas.json` has a `dev-backend` build profile (extends `preview`) that points
`EXPO_PUBLIC_API_URL` at `https://dev-mind.logitslab.com`:

```bash
eas build --profile dev-backend --platform ios      # or android
```

For local development against the dev site, run with:

```bash
EXPO_PUBLIC_API_URL=https://dev-mind.logitslab.com npx expo start
```

## Promotion to production

When `dev` is ready:

1. Apply the pending migrations to the **prod** Supabase project
   (`npm run db:migrate -- <prod-ref>`, or the SQL-editor paste).
   They have already soaked on MindKshetra-dev.
2. Open a PR `dev → main` in each repo. Web deploys to production on merge;
   mobile's version-bump + EAS release workflows take over from there.

Never cherry-pick around `dev`.
