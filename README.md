# MindKshetra

Clarity from the Gita, for the battlefield of the mind.

A barebones Bhagavad Gita companion web app:

- **Explore** — browse seeded verses by chapter (Sanskrit, IAST, Hindi, English)
- **Mood** — match how you feel to themed verses
- **Ask Madhav** — chat with a Groq-powered guide grounded in retrieved verses

No auth. Local JSON content only.

## Setup

```bash
npm install
cp .env.example .env.local
```

Add your Groq API key to `.env.local`:

```
GROQ_API_KEY=your_key_here
```

Get a key at [console.groq.com](https://console.groq.com).

### Production Redis (Vercel)

Rate limits and AI story cache need **shared** storage across serverless instances. Without Redis, each instance keeps its own in-memory counters/cache.

1. Create a Redis database at [console.upstash.com](https://console.upstash.com) (free tier is enough).
2. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**.
3. In Vercel → Project → Settings → Environment Variables, set both for Production (and Preview if you want).
4. Redeploy.
5. Check `https://<your-domain>/api/health` — `redis.configured` and `redis.reachable` should be `true`.

Locally, Redis is optional; memory fallback is used when unset.

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
```

Runs Explore search + Madhav retrieve regression cases and citation gating checks.

Commentary QA / repair vs source:

```bash
node scripts/qa-commentary.cjs          # report
node scripts/qa-commentary.cjs --fix   # fill placeholder meanings
```

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Groq (`qwen/qwen3.6-27b`) for Madhav chat
- Optional Upstash Redis for rate limits + story cache
- Verse data in [`data/slokas.json`](data/slokas.json) — all 18 chapters (701 verses), sourced from [gita/gita](https://github.com/gita/gita) / [vedicscriptures](https://vedicscriptures.github.io/) (Sivananda EN, Ramsukhdas HI)

## Manual smoke checklist

1. Home shows MindKshetra brand, tagline, and three entry links
2. Explore search (e.g. `2.47` or “duty”) + chapter browse → verse detail with prev/next and word meanings
3. Empty / typo search shows “Did you mean” + nearest verses
4. Mood → pick a mood → matched verses + “Ask Madhav about this”
5. Ask Madhav → starter chips, ephemeral chat (clears on refresh), streamed reply + cited verse cards
6. Verse story panel generates EN/HI stories (cached when Redis or local FS is available)
7. Without `GROQ_API_KEY`, chat/story show a clear configuration error
8. `/api/health` reports Redis status in production

Chat is rate-limited (~20/min/IP). Story generation ~12/min/IP.
