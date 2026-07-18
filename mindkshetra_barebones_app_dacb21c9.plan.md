---
name: MindKshetra Barebones App
overview: Build MindKshetra — a minimal Next.js Gita companion with verse explore, mood match, and Madhav chat powered by Groq. No auth, no TTS, no Supabase; local JSON for content.
todos:
  - id: scaffold
    content: Scaffold Next.js + Tailwind; MindKshetra layout, nav, home with name/tagline/description
    status: in_progress
  - id: content-layer
    content: Add slokas.json seed + lib loaders/APIs for slokas and moods
    status: pending
  - id: explore-mood-ui
    content: Build Explore (chapters/verses/detail) and Mood match pages
    status: pending
  - id: groq-chat
    content: Wire Groq streaming /api/chat + Madhav ChatWindow with verse citations
    status: pending
  - id: polish-readme
    content: Mobile pass, error states, README with GROQ_API_KEY setup
    status: pending
isProject: false
---

# MindKshetra — barebones webapp plan

## Product

**Name:** MindKshetra

**Tagline:** Clarity from the Gita, for the battlefield of the mind.

**Description:** MindKshetra is a calm companion for moments of confusion, duty, and doubt. Browse every verse of the Bhagavad Gita, match your mood to teachings that speak to it, and talk with Madhav — a Groq-powered guide who answers in Krishna’s voice, grounded in real verses. No accounts, no audio, no clutter — just scripture, reflection, and practical guidance when your mind feels like a battlefield.

**Positioning (short):** A simple web app to explore the Gita, find verses for how you feel, and chat with Madhav for grounded guidance.

---

## Scope (deliberately cut from [gita-app-build-plan.md](gita-app-build-plan.md))

| Included | Excluded |
|---|---|
| Sloka explorer (browse by chapter) | Auth / favorites / journal |
| Mood match (tag-based) | TTS / ElevenLabs / audio player |
| Madhav chat via **Groq** | Story generation + story cache |
| Local `data/slokas.json` | Supabase, pgvector, Voyage embeddings |
| Streaming chat UI | Streaks, share cards, notifications |

**Default choices:** feature set = Explore + Mood + Chat; data = local JSON + tag matching (no vector RAG for v1). Chat retrieves top verses by simple keyword/tag overlap against the user message, then prompts Groq with those verses.

---

## Tech stack

- **Frontend / API:** Next.js 14 (App Router) + TypeScript + Tailwind
- **LLM:** Groq (`llama-3.3-70b-versatile` or current chat model) via official `groq-sdk` / OpenAI-compatible API → `https://api.groq.com/openai/v1`
- **Content:** `/data/slokas.json` loaded on the server (no DB)
- **Hosting target:** Vercel
- **Env:** `GROQ_API_KEY` only

---

## App structure

```
/app
  layout.tsx              # MindKshetra brand + nav
  page.tsx                # home: brand, tagline, 3 entry CTAs
  /explore/page.tsx
  /explore/[chapter]/page.tsx
  /sloka/[id]/page.tsx
  /mood/page.tsx
  /mood/[id]/page.tsx
  /madhav/page.tsx
  /api/slokas/route.ts
  /api/slokas/[id]/route.ts
  /api/moods/route.ts
  /api/moods/[id]/slokas/route.ts
  /api/chat/route.ts      # Groq streaming
/components
  SlokaCard.tsx
  SlokaDetail.tsx
  MoodGrid.tsx
  ChatWindow.tsx
/lib
  slokas.ts               # load + query JSON
  moods.ts                # mood → tag map
  retrieve.ts             # keyword/tag retrieval for chat
  groq.ts                 # Groq client + Madhav system prompt
/data
  slokas.json             # seed subset first (~1 chapter or ~50 verses), expand later
```

---

## Features

### 1. Home
- Hero brand **MindKshetra**, tagline, one-line description
- Three links: Explore · Mood · Ask Madhav

### 2. Explore
- Chapter grid → verse list → detail (Sanskrit, IAST, HI/EN)
- No story, no audio, no bookmark

### 3. Mood
- Grid of friendly moods (Anxious, Confused, Grieving, … from original plan)
- Match via shared tags in `slokas.json`; reuse `SlokaCard` / detail

### 4. Madhav (Groq)
- `POST /api/chat` with `{ messages: [{ role, content }] }`
- Server: retrieve 3–5 verses from JSON → build Madhav system prompt (from original plan) → stream Groq tokens
- UI: simple chat; show cited chapter.verse under each reply
- In-memory session only (no DB); crisis disclaimer in system prompt

**Madhav system prompt (reuse, Groq as inference):**
- Acknowledge briefly → ground in ONE retrieved verse → one concrete suggestion → under ~150 words → crisis-safe language

---

## Data seed

Start small so the app runs immediately:

- Seed **Chapter 2** (or ~40–50 well-known verses) into `slokas.json` with verified translations + tags
- Shape matches original plan (`chapter`, `verse_number`, Sanskrit, IAST, HI/EN, `tags`)
- Moods map to those tags in `lib/moods.ts`

Later (out of scope): full ~700 verses, then optional Supabase + embeddings.

---

## Phased build

1. **Scaffold** — Next.js + Tailwind; layout/nav branded MindKshetra; home page with description
2. **Content layer** — `slokas.json` + `lib/slokas.ts` / `moods.ts` + list/detail API routes
3. **Explore + Mood UI** — chapter browse, sloka detail, mood grid + matched list
4. **Groq chat** — `lib/groq.ts`, `/api/chat` streaming, `ChatWindow` with citations
5. **Polish** — mobile layout, empty/error states, README with `GROQ_API_KEY` setup

---

## Explicit non-goals (v1)

- Supabase / auth / favorites
- Voyage / pgvector RAG
- ElevenLabs / any TTS
- AI story generation
- Tests beyond manual smoke checks

---

## Success criteria

- Local `npm run dev` works with only `GROQ_API_KEY` set
- User can browse seeded verses, pick a mood and see matches, and chat with Madhav (streamed Groq reply citing a real verse)
- No login wall; no audio controls
