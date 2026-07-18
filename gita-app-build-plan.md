# Gita companion app — build plan for Claude Code

> Save this file as `PLAN.md` (or `CLAUDE.md`) at your repo root. Work through
> the phases in order and hand each one to Claude Code as its own prompt, e.g.
> "Implement Phase 2 from PLAN.md." Resolve the **open decisions** at the
> bottom before starting Phase 0.

## 1. Product summary

Three modules sharing one content engine:

1. **Sloka explorer** — browse/search all ~700 verses. Each has an EN/HI
   translation, an AI-generated short story, and audio narration.
2. **Mood match** — user picks a feeling, gets a ranked list of matched
   verses, same detail treatment as above.
3. **Madhav_Bot** — free-text chat. Retrieves relevant verses and replies
   in Krishna's voice with grounded guidance and a concrete suggestion.

All three read from the same verse database, tag taxonomy, and story/audio
cache — build that layer once, well, before touching any UI.

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind | one deploy target, good perf for content pages |
| Backend | Next.js Route Handlers | no separate backend needed at this scale |
| Database | Postgres via Supabase | auth + storage + pgvector in one place |
| Vector search | pgvector (Supabase extension) | avoids a second vendor |
| Embeddings | Voyage AI (`voyage-3`) | Anthropic's recommended embedding partner, strong multilingual support |
| LLM | Claude API | story generation + Madhav_Bot responses |
| TTS | ElevenLabs | solid Hindi + English voice quality |
| Hosting | Vercel (app) + Supabase (data) | minimal ops |
| Auth | Supabase Auth, optional for MVP | can ship anonymous-first |

## 3. Repository structure

```
/app
  /explore
    page.tsx
    [chapter]/page.tsx
  /sloka/[id]/page.tsx
  /mood
    page.tsx
    [id]/page.tsx
  /madhav/page.tsx
  /api
    slokas/route.ts
    slokas/[id]/route.ts
    slokas/[id]/story/route.ts
    slokas/[id]/audio/route.ts
    moods/route.ts
    moods/[id]/slokas/route.ts
    chat/route.ts
/components
  SlokaCard.tsx
  SlokaDetail.tsx
  AudioPlayer.tsx
  MoodGrid.tsx
  ChatWindow.tsx
/lib
  supabase.ts
  claude.ts
  embeddings.ts
  tts.ts
/scripts
  seed-slokas.ts
  seed-embeddings.ts
  seed-stories.ts
/data
  slokas.json        # raw, verified source content
```

## 4. Data model

```sql
-- Core verse content
create table slokas (
  id serial primary key,
  chapter smallint not null,
  verse_number smallint not null,
  sanskrit_devanagari text not null,
  transliteration_iast text not null,
  word_meanings jsonb,
  hindi_translation text not null,
  english_translation text not null,
  recitation_audio_url text,
  created_at timestamptz default now(),
  unique (chapter, verse_number)
);

-- Theme / mood tags
create table tags (
  id serial primary key,
  name text unique not null,
  category text  -- 'emotion' | 'life_situation' | 'virtue'
);

create table sloka_tags (
  sloka_id int references slokas(id),
  tag_id int references tags(id),
  primary key (sloka_id, tag_id)
);

-- User-facing mood options, each mapped to one or more tags
create table moods (
  id serial primary key,
  label text not null,        -- "Anxious"
  icon text,
  tag_id int references tags(id)
);

-- Embeddings for semantic search (RAG for Madhav_Bot)
create extension if not exists vector;
alter table slokas add column embedding vector(1024);

-- AI-generated stories (cached variants)
create table stories (
  id serial primary key,
  sloka_id int references slokas(id),
  language text not null,     -- 'en' | 'hi'
  story_text text not null,
  created_at timestamptz default now()
);

create table story_audio (
  id serial primary key,
  story_id int references stories(id),
  voice text not null,
  audio_url text not null
);

-- Optional user features
create table favorites (
  user_id uuid references auth.users(id),
  sloka_id int references slokas(id),
  primary key (user_id, sloka_id)
);

create table journal_entries (
  id serial primary key,
  user_id uuid references auth.users(id),
  sloka_id int references slokas(id),
  reflection text,
  created_at timestamptz default now()
);

-- Madhav_Bot conversations
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),  -- nullable for anonymous
  created_at timestamptz default now()
);

create table chat_messages (
  id serial primary key,
  session_id uuid references chat_sessions(id),
  role text not null,          -- 'user' | 'assistant'
  content text not null,
  cited_sloka_ids int[],
  created_at timestamptz default now()
);
```

## 5. Content & tagging

**Sourcing note:** have the AI generate the *story*, never the *translation*.
Ground translations in established, verifiable sources (Prabhupada, Easwaran,
Radhakrishnan, Gandhi's commentary, etc.) rather than freely generating
scripture text — accuracy and respectful handling matter more here than in
most content apps.

**Tag taxonomy** (used for both mood-matching and embedding metadata):

Grief & loss · Anger · Anxiety & fear · Confusion / decision paralysis ·
Low self-worth / failure · Jealousy & comparison · Loneliness ·
Overwhelm / burnout · Guilt · Ego & pride · Attachment & desire ·
Detachment / letting go · Duty & responsibility (dharma) · Purpose & meaning ·
Impermanence & mortality · Discipline & habit · Relationships & conflict ·
Success & ambition · Gratitude & contentment · Devotion & surrender ·
Courage · Control of the mind · Equanimity · Action without attachment to
results

**User-facing moods** (friendlier labels, each maps to 1+ tags above):
Happy, Sad, Anxious, Angry, Confused, Grieving, Lonely, Overwhelmed, Guilty,
Jealous, Unmotivated, Fearful, Hopeful, Grateful, Facing a big decision,
Going through conflict, Feeling like a failure, Searching for purpose.

**Seed file format** (`/data/slokas.json`, one object per verse):
```json
{
  "chapter": 2,
  "verse_number": 47,
  "sanskrit_devanagari": "...",
  "transliteration_iast": "...",
  "hindi_translation": "...",
  "english_translation": "...",
  "word_meanings": { "karmani": "in action", "...": "..." },
  "tags": ["duty_responsibility", "detachment", "overwhelm_burnout"]
}
```

## 6. Feature specs

### 6.1 Sloka explorer
- Routes: `/explore` (18 chapter cards), `/explore/[chapter]` (verse list),
  `/sloka/[id]` (detail view)
- `GET /api/slokas?chapter=2` — list
- `GET /api/slokas/:id` — single verse + translations
- `POST /api/slokas/:id/story?lang=en` — body `{ regenerate: boolean }`,
  returns a story (cached variant or freshly generated)
- `GET /api/slokas/:id/audio?type=recitation|story&storyId=...` — returns
  audio URL, generates + caches via TTS if missing

### 6.2 Mood match
- Routes: `/mood` (grid), `/mood/[moodId]` (matched list)
- `GET /api/moods`, `GET /api/moods/:id/slokas` (join via shared tag)
- Reuses the sloka card / detail components from 6.1 — don't rebuild them

### 6.3 Madhav_Bot
- Route: `/madhav`
- `POST /api/chat` — body `{ sessionId, message }`, streams the response.
  Server flow: embed the query (Voyage) → vector-search top 3-5 slokas →
  build prompt from system persona + retrieved verses + last N turns →
  call Claude → stream tokens → persist message + `cited_sloka_ids`

## 7. AI integration

**Story generation prompt template:**
```
You are writing a short reflective story (150-250 words) for a Bhagavad
Gita reading app.

Verse: {sanskrit}
Translation: {english_translation}
Theme tags: {tags}

Write ONE modern, relatable scenario (a student, parent, employee, etc.
facing an everyday dilemma) whose resolution echoes the teaching of this
verse — without naming the verse or being preachy. End with a single quiet
line connecting back to the teaching. Keep it under 250 words. No title.
```

**Madhav_Bot system prompt template:**
```
You are Madhav — a name for Krishna — speaking the way Krishna spoke to
Arjuna: direct, warm, never clinical.

The user describes a problem or feeling. You are given 3-5 retrieved
verses (chapter.verse + English translation), ranked by relevance.

Respond in under 150 words:
1. Briefly acknowledge what they're going through, in your own words.
2. Ground your guidance in ONE retrieved verse — name it (chapter.verse)
   and explain what it means for their situation.
3. Give one concrete, practical suggestion.

Never diagnose. Never claim to replace professional or medical help. If
the message suggests possible crisis or self-harm, gently encourage
reaching out to a trusted person or a helpline, in addition to anything
else you say.
```

**Caching/cost strategy:** pre-generate 3 story variants per verse per
language at seed time (700 × 2 × 3 = 4,200 stories, one-time cost).
"Refresh" cycles cached variants first; only call the API fresh once all
variants for that verse have been seen.

## 8. Audio / TTS flow

Text → ElevenLabs API → mp3 → upload to Supabase storage → save URL in
`story_audio` → serve via CDN URL, cache-first lookup before regenerating.

## 9. Phased build plan

**Phase 0 — Scaffolding**
- [ ] Next.js + TS + Tailwind init
- [ ] Supabase project, connect env vars
- [ ] Base layout, nav (Explore / Mood / Madhav_Bot), dark mode toggle

**Phase 1 — Content foundation**
- [ ] Run schema migration (Section 4)
- [ ] Seed script: load `slokas.json` into `slokas`, `tags`, `sloka_tags`
- [ ] Seed `moods`, mapped to tags
- [ ] Generate + store embeddings for all slokas (Voyage API)

**Phase 2 — Sloka explorer (static)**
- [ ] `/explore` chapter grid
- [ ] `/sloka/[id]` detail page: Sanskrit, transliteration, HI/EN — no AI yet
- [ ] Bookmark button (if auth enabled)

**Phase 3 — Story generation**
- [ ] `/api/slokas/:id/story` endpoint using the template in Section 7
- [ ] Pre-generation seed script (3 variants/verse/lang)
- [ ] "Refresh story" UI + cache-cycle logic

**Phase 4 — Audio**
- [ ] TTS endpoint + storage caching
- [ ] Audio player component (recitation vs. story toggle)

**Phase 5 — Mood match**
- [ ] `/mood` grid UI
- [ ] `/mood/[id]` matched list (reuse Phase 2/3 components)

**Phase 6 — Madhav_Bot**
- [ ] Embedding + vector-search query function
- [ ] `/api/chat` streaming endpoint with RAG + system prompt
- [ ] Chat UI with a cited-verse card under each reply
- [ ] Crisis-language check + resource fallback

**Phase 7 — Polish**
- [ ] Shareable story/verse image card
- [ ] Journal/reflection box
- [ ] Daily streak + reminder notification
- [ ] Sloka-of-the-day on home screen

**Phase 8 — QA & deploy**
- [ ] Spot-check seed data against source translations
- [ ] Mobile responsiveness pass
- [ ] Deploy to Vercel + Supabase production

## 10. Environment variables

```
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
ELEVENLABS_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 11. Working with Claude Code

- Keep this file at the repo root and reference it directly: "Implement
  Phase 3 from PLAN.md."
- Work one phase at a time; commit after each phase completes.
- Ask it to write a short test or manual checklist per phase before moving on.
- Update this file as scope changes — treat it as the shared source of truth,
  not a one-time brief.

## 12. Open decisions before you start

- App name (this doc uses no placeholder name — pick one before Phase 0)
- Anonymous-first vs. requiring login for MVP
- Final embedding/TTS vendor choice (cost-dependent)
- Web-only for now, or design with a future mobile wrapper in mind
