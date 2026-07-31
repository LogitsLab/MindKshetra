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
   environment "Preview", branch `dev`):
   - `NEXT_PUBLIC_SITE_URL=https://dev-mind.logitslab.com` — every hardcoded
     origin in the app already falls back through this variable.
   - Everything else (Supabase, Groq, Redis, Resend keys) is inherited from the
     existing Preview environment. If dev should ever get its own Supabase
     project, override the two `NEXT_PUBLIC_SUPABASE_*` vars here and nothing
     else changes.
4. **Supabase redirect URL**: Authentication → URL Configuration → add
   `https://dev-mind.logitslab.com/auth/callback` (sign-in on the dev site
   fails without it).
5. **Vercel cron note**: `vercel.json` crons only run on the production
   deployment — the dev site sends no scheduled emails. That is intentional.

## Database migrations

New migrations under `supabase/migrations/` are **written on `dev` but not
auto-applied** — there is one Supabase project, shared by prod and dev sites.
All Phase 1+ migrations are strictly additive (new tables, new columns with
defaults), so applying them does not affect the live app; still, applying is an
owner action:

```bash
npx supabase db push   # after linking: npx supabase link --project-ref <ref>
```

Until a migration is applied, its API routes degrade (empty data or 503), and
the UI shows empty states — the dev site stays browsable either way.

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

When `dev` is ready: apply any un-applied migrations, then open a PR
`dev → main` in each repo. Web deploys to production on merge; mobile's
version-bump + EAS release workflows take over from there. Never cherry-pick
around `dev`.
