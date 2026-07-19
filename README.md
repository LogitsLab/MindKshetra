# MindKshetra

Clarity from the Gita, for the battlefield of the mind.

A barebones Bhagavad Gita companion web app:

- **Explore** — browse seeded verses by chapter (Sanskrit, IAST, Hindi, English)
- **Mood** — match how you feel to themed verses
- **Ask Madhav** — chat with a Groq-powered guide grounded in retrieved verses

No auth. No text-to-speech. Local JSON content only.

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

Optional (production on Vercel): set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared rate limits and story cache across serverless instances.

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

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Groq (`qwen/qwen3.6-27b`) for Madhav chat
- Verse data in [`data/slokas.json`](data/slokas.json) — all 18 chapters (701 verses), sourced from [gita/gita](https://github.com/gita/gita) (Sivananda EN, Ramsukhdas HI)

## Manual smoke checklist

1. Home shows MindKshetra brand, tagline, and three entry links
2. Explore search (e.g. `2.47` or “duty”) + chapter browse → verse detail with prev/next and word meanings
3. Mood → pick a mood → matched verses + “Ask Madhav about this”
4. Ask Madhav → starter chips, ephemeral chat (clears on refresh), streamed reply + cited verse cards
5. Verse story panel generates EN/HI stories (cached locally when FS is writable)
6. Without `GROQ_API_KEY`, chat/story show a clear configuration error

Chat is rate-limited (~20/min/IP). Story generation ~12/min/IP.
