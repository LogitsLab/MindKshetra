# MindKshetra

Clarity from the Gita, for the battlefield of the mind.

Open-source web companion for the Bhagavad Gita — and Jyotish birth charts — at [mind.logitslab.com](https://mind.logitslab.com).

**Mobile app:** [LogitsLab/MindKshetra-app](https://github.com/LogitsLab/MindKshetra-app)

## Features

- **Explore** — 701 verses (Sanskrit, IAST, Hindi, English), search, favorites, journal
- **Mood** — match how you feel to themed verses
- **Ask Madhav** — Groq-powered chat grounded in retrieved verses (optional vector RAG)
- **Astrology** — birth charts, dashas, structured predictions, chart chat
- **Account** — sign-in, streaks, optional Verse of the Day email

## Quick start

```bash
npm install
cp .env.example .env.local
# Minimum: GROQ_API_KEY=…  (https://console.groq.com)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase the app uses local JSON (`CONTENT_SOURCE=json`). For full account + DB features, see below.

## Contributing

This is an **open repository**. We welcome:

- **Issues** — bugs, questions, or ideas (include context and motivation)
- **Pull requests** — focused changes with a clear description

Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a PR.  
If you are not ready to code, opening a detailed issue with your idea is enough to start a conversation.

## Environment

Copy [`.env.example`](.env.example). Important variables:

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Madhav chat + prediction write-ups |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | Auth + DB (when `CONTENT_SOURCE=db`) |
| `VOYAGE_API_KEY` | Optional semantic retrieval |
| `UPSTASH_REDIS_*` | Shared rate limits / cache in production |
| `RESEND_*` / `CRON_SECRET` | Optional Verse of the Day email |

Never commit real secrets. Production env lives in Vercel; deploy uses GitHub Actions (see maintainers’ secrets in repo Settings).

## Supabase (optional / production)

1. Create a project; enable **pgvector**
2. Set Supabase env vars in `.env.local`
3. `npm run db:migrate` → apply SQL in the Supabase editor  
4. `npm run db:seed` (+ `npm run db:embeddings` if using Voyage)
5. Set `CONTENT_SOURCE=db`

Auth: enable Anonymous, Google, and Email as needed. Redirect URLs should include local and production `/auth/callback` URLs (and mobile schemes if you use the app). Details: [`docs/api.md`](docs/api.md).

## Scripts

```bash
npm run dev          # local server
npm run build        # production build
npm test             # unit / golden tests
npm run eval         # retrieval eval
npm run qa:astrology # astrology fixtures
```

## Stack

Next.js 14 · TypeScript · Tailwind · Supabase · Groq · Voyage · Upstash Redis · Swiss Ephemeris (astrology)

## Design

Visual system notes: [`DESIGN.md`](DESIGN.md).

## Security

- Never commit `.env`, service accounts, or API keys
- Report suspected secret leaks in a **private** security report to the maintainers if possible; otherwise open an issue without pasting secrets
