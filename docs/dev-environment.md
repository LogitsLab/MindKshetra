# Dev environment — branch model and dev-mind.logitslab.com

## Branch model

- **`dev`** — the integration branch, in BOTH repos (web + mobile). All feature
  work merges here. It deploys continuously to
  **https://dev-mind.logitslab.com** via `.github/workflows/deploy-dev.yml`.
- **`main`** — production only. Nothing merges to `main` except an owner-driven
  promotion of `dev` (which triggers the existing production deploy on web and
  the EAS release train on mobile). Day-to-day work never targets it.

## One-time setup (owner, ~15 minutes)

1. **Vercel domain**: project → Settings → Domains → add
   `dev-mind.logitslab.com`. The deploy-dev workflow aliases each dev
   deployment to it; adding the domain to the project is what authorizes that
   alias.
2. **DNS**: add a CNAME for `dev-mind` → `cname.vercel-dns.com` wherever
   `logitslab.com` DNS lives.
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

## Two Supabase projects

- **Prod project** — serves `main` / mind.logitslab.com. Schema moves only at
  promotion time.
- **MindKshetra-dev** — serves the `dev` branch / dev-mind.logitslab.com and
  local development. Fresh migrations land here first and soak.

Content does not live in either database by default (`CONTENT_SOURCE=json`
serves all 701 verses from the repo), so the dev project needs **no seeding**
— only schema.

### Applying migrations

**`supabase db push` does not work in this repo** — the migrations are
numbered `001_…`, which the CLI's `<timestamp>_name.sql` convention silently
ignores (push reports "up to date" while applying nothing). Use one of:

```bash
# Preferred (needs a one-time `npx supabase login`):
node scripts/apply-migrations.cjs xtadssxgwskyobxmhnxa   # MindKshetra-dev

# No-CLI fallback — paste into the dashboard SQL editor:
node scripts/dev-bootstrap-sql.cjs | pbcopy
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
of the same change (db push or the bootstrap script). The prod project is
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
   (`node scripts/apply-migrations.cjs <prod-ref>`, or the SQL-editor paste).
   They have already soaked on MindKshetra-dev.
2. Open a PR `dev → main` in each repo. Web deploys to production on merge;
   mobile's version-bump + EAS release workflows take over from there.

Never cherry-pick around `dev`.
