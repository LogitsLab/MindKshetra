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

**Email magic link** — enable Email provider in Supabase. For reliable delivery in production, configure custom SMTP under Auth → SMTP (Resend, Postmark, etc.). Locally, Supabase’s default sender is fine for testing; check spam. Links must be opened on the **same browser/device** that requested them (PKCE).

In Supabase → Authentication → URL Configuration:
- **Site URL** must be the production origin: `https://mind.logitslab.com` (not `http://localhost:3000`). If Site URL stays on localhost, magic-link emails fall back there whenever Redirect URLs don’t match — that is why sign-in opens `localhost:3000/?code=…`.
- **Redirect URLs** must include:

- `http://localhost:3000/auth/callback`
- `https://mind.logitslab.com/auth/callback`
- `https://mindkshetra.vercel.app/auth/callback`
- `mindkshetra://auth/callback`
- `exp://127.0.0.1:8081/--/auth/callback` (Expo Go local)

**Google OAuth** — enable in Supabase → Authentication → Providers → Google (Client ID + secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)). Google’s authorized redirect URI must be the Supabase callback: `https://<project-ref>.supabase.co/auth/v1/callback`. Web and mobile Account screens both call “Continue with Google”.

**Apple Sign-In** — wired on iOS native via Expo; enable the Apple provider in Supabase when ready. Not shown on web yet.

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

Sends today’s verse with Sanskrit, translations, meaning, word meanings, and the reflection story. **Auth magic links are separate** (Supabase SMTP).

1. Sign up at [resend.com](https://resend.com) → **API Keys** → create a **full access** key (send-only cannot manage domains).
2. Add to `.env` / Vercel:
   ```
   RESEND_API_KEY=re_...
   RESEND_FROM=MindKshetra <onboarding@resend.dev>
   ```
3. **Test mode:** `onboarding@resend.dev` only delivers to the Resend account email. Prefer the verified domain immediately.
4. **Production:** Domain **`mind.logitslab.com`** is verified in Resend. Set:
   ```
   RESEND_FROM=MindKshetra <noreply@mind.logitslab.com>
   ```
   in `.env` **and** Vercel, then redeploy. Use the same from-address in Supabase Auth SMTP if you want branded auth mail.

Users can turn emails **Off** anytime in Account settings.

**Daily schedule:** Vercel Cron hits `/api/cron/votd-email` at **18:55 IST** (`25 13 * * *` UTC). Set `CRON_SECRET` in Vercel (same value Vercel sends as `Authorization: Bearer …`). Subscribers are all non-anonymous users with an email who have not turned VOTD emails off.

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
