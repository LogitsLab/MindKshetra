# MindKshetra

Clarity from the Gita, for the battlefield of the mind.

A Bhagavad Gita companion web app:

- **Explore** — browse 701 verses by chapter (Sanskrit, IAST, Hindi, English)
- **Mood** — match how you feel to themed verses
- **Ask Madhav** — chat with a Groq-powered guide grounded in retrieved verses (vector RAG when Supabase + Voyage are configured)
- **Account** — sign in, favorites, journal reflections, visit streaks

## Setup

```bash
npm install
cp .env.example .env.local
```

Minimum for local dev:

```
GROQ_API_KEY=your_key_here
```

Get a key at [console.groq.com](https://console.groq.com).

Without Supabase, the app runs on local JSON (`CONTENT_SOURCE=json`, default). With Supabase, set `CONTENT_SOURCE=db` after seeding.

## Supabase (v2 production)

1. Create a project at [supabase.com](https://supabase.com).
2. Enable the **pgvector** extension (SQL: `create extension if not exists vector;`).
3. Add env vars to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (seed scripts only — never expose to the browser)
4. Run migrations and seed:

```bash
npm run db:migrate   # prints SQL paths — apply via Supabase SQL editor or CLI
npm run db:seed      # 701 verses, tags, moods, seed stories
```

5. Optional vector RAG:

```bash
# Add VOYAGE_API_KEY to .env.local
npm run db:embeddings
```

6. Set `CONTENT_SOURCE=db` and redeploy.

Enable **Anonymous**, **Google**, and **Email (magic link)** providers in Supabase Auth for account features.

### Auth providers (optional setup)

**Email magic link** — enable Email provider in Supabase. For reliable delivery in production, configure custom SMTP under Auth → SMTP (Resend, Postmark, etc.). Locally, Supabase’s default sender is fine for testing; check spam.

**Google OAuth** — create an OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials), then paste Client ID + secret into Supabase → Authentication → Providers → Google. Add your site URL and `/auth/callback` (or Supabase callback URL shown in the dashboard) to authorized redirect URIs.

**Apple Sign-In** — deferred (mobile later). Not wired in the web app yet.

API contracts: [`docs/api.md`](docs/api.md).

## Production (Vercel + Supabase)

1. Push to GitHub and import in [Vercel](https://vercel.com).
2. Set environment variables (Production + Preview):
   - `GROQ_API_KEY`
   - `NEXT_PUBLIC_SITE_URL` (your Vercel URL or custom domain)
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
   - `CONTENT_SOURCE=db`
   - `VOYAGE_API_KEY` (for vector retrieval)
3. Run `db:migrate` + `db:seed` + `db:embeddings` against your Supabase project (local machine with service role key).
4. In Supabase → Authentication → URL configuration, add your Vercel domain to redirect URLs.
5. Deploy. Verify `GET /api/health` shows `database.reachable: true`.

### Redis

Rate limits and AI story cache need shared storage across serverless instances. Without Redis, each instance uses in-memory fallback.

1. Create Redis at [console.upstash.com](https://console.upstash.com).
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel.
3. Check `/api/health` — `redis.reachable` should be `true`.

### Verse of the Day email (Resend)

Sends today’s verse with Sanskrit, translations, meaning, word meanings, and the reflection story.

1. Sign up at [resend.com](https://resend.com) → **API Keys** → create a key.
2. Add to `.env.local` / Vercel:
   ```
   RESEND_API_KEY=re_...
   RESEND_FROM=MindKshetra <onboarding@resend.dev>
   ```
3. **Local / free tier:** Resend only delivers to the email you used to sign up unless you verify a domain. Keep `onboarding@resend.dev` as From for tests.
4. **Production:** Resend → Domains → add your domain (DNS records), then set e.g. `RESEND_FROM=MindKshetra <votd@yourdomain.com>`.
5. Apply `supabase/migrations/004_user_prefs.sql` **and** `005_user_profile.sql` in the Supabase SQL editor (email opt-out + profile fields).
6. Restart the app. On **Account → Settings**, leave “Verse of the Day emails” **On**, then tap **Email today’s verse**.

Users can turn emails **Off** anytime in Account settings (the send button hides; the API returns 403 if forced). Profile fields (name, DOB, place, preferred language, about) live in the same Settings section; email is shown from the signed-in account and isn’t edited there.

> Sign-in magic links use **Supabase Auth SMTP** (separate from Resend). Configure Auth → SMTP if magic links need a custom sender.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Eval

```bash
npm run eval
npm run eval:hybrid   # requires Voyage + Supabase embeddings (≥200 by default)
npm run qa:commentary
```

Tag/JSON retrieve always runs. Hybrid vector mode is opt-in:

```bash
npm run eval:hybrid   # Voyage + match_slokas, target ≥90% (needs ≥200 embeddings)
```

Pre-generate extra story variants (expensive — start with a limit):

```bash
npm run db:pregen-stories -- --limit 5
```

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + pgvector + Auth) when configured
- Groq (`qwen/qwen3.6-27b`) for Madhav chat
- Voyage `voyage-3` embeddings for semantic retrieval
- Upstash Redis for rate limits + story cache
- Verse data seeded from [`data/slokas.json`](data/slokas.json)

## Manual smoke checklist

1. Home shows MindKshetra brand, tagline, verse of the day link + streak when signed in
2. Explore search (`2.47` or “duty”) + chapter browse → verse detail with favorites, journal, share
3. Mood picker → matched verses
4. Madhav chat streams with citations; refresh restores session when Supabase is configured
5. Account sign-in, favorites, reflections, data export, optional VOTD email
6. Light/dark theme toggle persists
7. `/api/health` reports redis + database status
