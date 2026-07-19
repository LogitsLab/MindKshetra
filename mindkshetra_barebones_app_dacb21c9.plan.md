---
name: MindKshetra Barebones App
overview: Build MindKshetra — a Next.js Gita companion with full-corpus verse explore + search, mood match, Madhav chat (Groq), and bilingual EN/HI verse stories. No auth, no TTS, no Supabase; local JSON for content.
todos:
  - id: scaffold
    content: Scaffold Next.js + Tailwind; MindKshetra layout, nav, home with name/tagline/description
    status: completed
  - id: content-layer
    content: Add full slokas.json (701 verses) + chapters.json + lib loaders/APIs for slokas and moods
    status: completed
  - id: explore-mood-ui
    content: Build Explore (search + chapters/verses/detail), Mood match, EN/HI UI, verse stories
    status: completed
  - id: groq-chat
    content: Wire Groq streaming /api/chat + Madhav ChatWindow with verse citations + rate limits
    status: completed
  - id: polish-readme
    content: Mobile pass, error states, README with GROQ_API_KEY setup, Vercel deploy workflow
    status: completed
isProject: false
---

# MindKshetra — barebones webapp plan

Cut down from [gita-app-build-plan.md](gita-app-build-plan.md), then expanded to cover full corpus, search, i18n, and verse stories while keeping auth/TTS/Supabase out.

## Product

**Name:** MindKshetra

**Tagline:** Clarity from the Gita, for the battlefield of the mind.

**Description:** MindKshetra is a calm companion for moments of confusion, duty, and doubt. Browse every verse of the Bhagavad Gita, match your mood to teachings that speak to it, generate a short verse story, and talk with Madhav — a Groq-powered guide who answers in Krishna’s voice, grounded in real verses. No accounts, no audio, no clutter — just scripture, reflection, and practical guidance when your mind feels like a battlefield.

**Positioning (short):** A simple web app to explore the Gita, find verses for how you feel, and chat with Madhav for grounded guidance.

---

## Scope

| Included | Excluded |
|---|---|
| Full sloka explorer (18 chapters, search) | Auth / favorites / journal |
| Mood match (tag-based, 18 moods) | TTS / ElevenLabs / audio player |
| Madhav chat via **Groq** (streaming) | Supabase, pgvector, Voyage embeddings |
| Local `data/slokas.json` + `chapters.json` | Streaks, share cards, notifications |
| EN/HI UI language toggle (localStorage) | Persisted chat history across sessions |
| AI verse stories + local FS cache | Vector RAG |
| Rate limits on chat (~20/min/IP) and story (~12/min/IP) | Automated test suite |

**Default choices:** Explore + Mood + Chat + verse stories; data = local JSON + tag/keyword matching (no vector RAG). Chat retrieves top verses by keyword/tag overlap against the user message, then prompts Groq with those verses; verify/fix citations before returning.

---

## Tech stack

- **Frontend / API:** Next.js 14 (App Router) + TypeScript + Tailwind
- **LLM:** Groq (`qwen/qwen3.6-27b`) via OpenAI-compatible API → `https://api.groq.com/openai/v1`
- **Content:** `/data/slokas.json` (701 verses, all 18 chapters) + `/data/chapters.json`; stories cache in `/data/stories-cache.json` when FS is writable
- **Hosting target:** Vercel (GitHub Actions deploy on `main`)
- **Env:** `GROQ_API_KEY` (chat + stories); `NEXT_PUBLIC_SITE_URL` (metadata / OG)

---

## App structure

```
/app
  layout.tsx                 # brand, LanguageProvider, Nav
  page.tsx                   # home: featured verse, path CTAs, mood preview
  not-found.tsx
  /explore/page.tsx
  /explore/[chapter]/page.tsx
  /sloka/[id]/page.tsx
  /mood/page.tsx
  /mood/[id]/page.tsx
  /madhav/page.tsx
  /api/slokas/route.ts              # list + ?q= search
  /api/slokas/[id]/route.ts
  /api/slokas/[id]/story/route.ts   # GET cache / POST generate
  /api/moods/route.ts
  /api/moods/[id]/slokas/route.ts
  /api/chat/route.ts                # Groq streaming + citations
/components
  Nav.tsx, HomePageClient.tsx, EmptyState.tsx
  ExplorePageClient.tsx, ExploreSearch.tsx, ChapterPageClient.tsx
  SlokaCard.tsx, SlokaDetail.tsx, SlokaPageClient.tsx, VerseStory.tsx
  MoodGrid.tsx, MoodDetailClient.tsx
  ChatWindow.tsx
  LanguageProvider.tsx
/lib
  types.ts, slokas.ts, chapters.ts, moods.ts, moodVisuals.ts
  retrieve.ts, cite.ts, groq.ts, rateLimit.ts
  stories.ts, verseDisplay.ts
  i18n/dictionary.ts
/data
  slokas.json          # 701 verses (gita/gita: Sivananda EN, Ramsukhdas HI)
  chapters.json        # chapter titles / metadata
  stories-cache.json   # generated story variants (when writable)
/public
  brand/, icons/moods|paths, images/, ornaments/
```

---

## Features

### 1. Home
- Hero brand **MindKshetra**, tagline, one-line description
- Featured verse, three path CTAs: Explore · Mood · Ask Madhav
- Mood preview strip; EN/HI toggle via `LanguageProvider` (persist in localStorage)

### 2. Explore
- Chapter grid (`chapters.json`) → verse list → detail
- Search (`/api/slokas?q=`) — refs like `2.47` or free-text over translations/tags
- Detail: Sanskrit, IAST, HI/EN translation + commentary/meaning, word meanings, prev/next, teaching passage when applicable
- **Verse story** panel on detail: `POST /api/slokas/[id]/story` generates bilingual EN/HI stories via Groq; `GET` serves cache; store variants in `stories-cache.json` when FS is writable; rate-limit ~12/min/IP

### 3. Mood
- Grid of 18 moods with EN/HI labels and SVG icons (`lib/moods.ts`, `lib/moodVisuals.ts`) — e.g. Anxious, Confused, Grieving, Facing a big decision, Searching for purpose, …
- Match via shared tags in `slokas.json`; reuse `SlokaCard` / detail; deep-link into Madhav for that mood

### 4. Madhav (Groq)
- `POST /api/chat` with `{ messages: [{ role, content }], language?: "en"|"hi" }`
- Server: rate-limit (~20/min/IP) → retrieve ~5 verses (`lib/retrieve.ts`) → build Madhav system prompt → stream Groq tokens; strip `<think>` blocks; verify/fix citations (`lib/cite.ts`)
- UI: starter chips; in-memory session only (clears on refresh); show cited verse cards under each reply
- Clear error when `GROQ_API_KEY` is missing

**Madhav system prompt:**
- Reply in four short sections: Story → From the Gita → How to deal with it → A short short
- Ground in 1–2 retrieved verses only; never invent chapter.verse numbers
- Under ~320 words; crisis-safe language (encourage helpline / trusted person when needed)
- Support EN or HI based on request language

---

## Data

- Load full corpus: **701 verses**, chapters 1–18
- Shape: `id`, `chapter`, `verse_number`, Sanskrit Devanagari, IAST, HI/EN translations, optional `english_meaning` / `hindi_meaning`, `word_meanings`, `tags`
- Source: [gita/gita](https://github.com/gita/gita) (Sivananda EN, Ramsukhdas HI) + project tagging
- Moods map to those tags in `lib/moods.ts`; chapter metadata in `data/chapters.json`

---

## Phased build

1. **Scaffold** — Next.js + Tailwind; layout/nav branded MindKshetra; home with description and path CTAs; brand/path assets
2. **Content layer** — full `slokas.json` + `chapters.json` + `lib/slokas.ts` / `moods.ts` / `chapters.ts` + list/detail/search/mood API routes
3. **Explore + Mood UI** — chapter browse, search, sloka detail (meanings, prev/next), mood grid + matched list; EN/HI `LanguageProvider` + dictionary
4. **Verse stories** — `lib/stories.ts`, `/api/slokas/[id]/story`, `VerseStory` panel with cache + rate limit
5. **Groq chat** — `lib/groq.ts`, `lib/retrieve.ts`, `lib/cite.ts`, `/api/chat` streaming, `ChatWindow` with citations + rate limit
6. **Polish** — mobile layout, empty/error/not-found states, README with `GROQ_API_KEY` / `NEXT_PUBLIC_SITE_URL`, Vercel deploy workflow

---

## Explicit non-goals

- Supabase / auth / favorites / journal
- Voyage / pgvector RAG
- ElevenLabs / any TTS
- Persisted chat history across sessions
- Tests beyond manual smoke checks

---

## Success criteria

- Local `npm run dev` works with `GROQ_API_KEY` (+ optional `NEXT_PUBLIC_SITE_URL`)
- User can browse the full corpus, search verses, pick a mood and see matches, generate a verse story, and chat with Madhav (streamed Groq reply citing real verses)
- Clear configuration errors without API key; chat/story rate limits behave predictably
- No login wall; no audio controls
- Push to `main` deploys to Vercel via GitHub Actions
