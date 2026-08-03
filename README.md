# MindKshetra

Clarity from the Gita, for the battlefield of the mind.

Open-source web companion for the Bhagavad Gita — and Jyotish birth charts — at
[mind.logitslab.com](https://mind.logitslab.com) (dev builds:
[mind-dev.logitslab.com](https://mind-dev.logitslab.com)).

**Mobile app:** [LogitsLab/MindKshetra-app](https://github.com/LogitsLab/MindKshetra-app)


## Features

- **Explore** — 701 verses (Sanskrit, IAST, Hindi, English), search, favorites, journal
- **Mood** — match how you feel to themed verses
- **Ask Madhav** — Groq-powered chat grounded in retrieved verses (optional vector RAG)
- **Astrology** — birth charts, dashas, structured predictions, chart chat
- **Panchang** — daily elements and a month calendar of observances
- **Account** — sign-in, streaks, optional Verse of the Day email

## Quick start — zero keys

```bash
git clone https://github.com/LogitsLab/MindKshetra.git
cd MindKshetra
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). That's the whole first
run — **no `.env` file, no API keys, ~5 minutes** — and the app is fully
working signed-out:

- all 701 verses, search, moods (bundled `data/slokas.json`)
- birth charts and daily panchang (`sweph` ships prebuilt binaries and the
  Swiss Ephemeris files are committed in `ephemeris/`)
- Verse of the Day, verse stories from the curated notes

Keys only unlock the layers on top: **accounts** (Supabase), **AI chat**
(Groq), and Verse of the Day **email** (Resend). Add them in that order,
only when you need them.

## Add accounts (Supabase)

Enables sign-in, favorites sync, journal, reading progress, sadhana streaks,
saved chart members, and community reflections.

1. Create a project at [supabase.com](https://supabase.com); enable **pgvector**
2. `cp .env.example .env.local` and fill in the `NEXT_PUBLIC_SUPABASE_*` and
   `SUPABASE_SERVICE_ROLE_KEY` values
3. Apply migrations: `npm run db:migrate -- <project-ref>`
   (do **not** use `supabase db push` — it is documented broken for this
   repo's migration naming)
4. `npm run db:seed` (+ `npm run db:embeddings` if using Voyage)
5. Set `CONTENT_SOURCE=db`

Auth: enable Anonymous, Google, and Email as needed. Redirect URLs should
include local and production `/auth/callback` URLs (and mobile schemes if you
use the app). Details: [`docs/api.md`](docs/api.md).

## Add AI chat (Groq)

The last optional tier: set `GROQ_API_KEY` in `.env.local`
([console.groq.com](https://console.groq.com), free tier is fine) to enable
Ask Madhav chat, AI story variants, and prediction write-ups. Optional on top
of that: `VOYAGE_API_KEY` for hybrid semantic retrieval.

## Contributing

This is an **open repository**. We welcome:

- **Issues** — bugs, questions, or ideas (include context and motivation)
- **Pull requests** — focused changes with a clear description

**PRs target the `dev` branch, never `main`.** `dev` is the integration
branch and deploys to [mind-dev.logitslab.com](https://mind-dev.logitslab.com);
`main` is production ([mind.logitslab.com](https://mind.logitslab.com)).

Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a PR.
If you are not ready to code, opening a detailed issue with your idea is
enough to start a conversation.

## Architecture

Full system design (web + API + mobile + astrology + deploy): **[ARCHITECTURE.md](ARCHITECTURE.md)**.
API reference: [`docs/api.md`](docs/api.md).

## Environment

Copy [`.env.example`](.env.example). Everything is optional for the local
first run; variables by tier:

| Tier | Variable | Purpose |
|------|----------|---------|
| Accounts | `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | Auth + DB (when `CONTENT_SOURCE=db`) |
| AI chat | `GROQ_API_KEY` | Madhav chat, story generation, prediction write-ups |
| AI chat | `VOYAGE_API_KEY` | Optional semantic retrieval |
| Email | `RESEND_*` / `CRON_SECRET` | Optional Verse of the Day email + cron |
| Production | `UPSTASH_REDIS_*` | Shared rate limits / cache across serverless instances |
| Production | `NEXT_PUBLIC_SITE_URL` | Canonical site URL (metadata / share links) |

Never commit real secrets. Production env lives in Vercel; deploy uses GitHub
Actions (see maintainers' secrets in repo Settings).

## Scripts

```bash
npm run dev          # local server
npm run build        # production build
npm test             # unit / golden tests
npm run lint         # eslint
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
