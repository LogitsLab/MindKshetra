# MindKshetra API

REST JSON endpoints for web and future mobile clients. Base URL: `NEXT_PUBLIC_SITE_URL` (e.g. `https://mindkshetra.app`).

## Auth

User-specific routes use Supabase session cookies (web) or `Authorization: Bearer <access_token>` (mobile).

Anonymous chat sessions work without auth; pass `sessionId` from the chat stream to restore history.

---

## Health

### `GET /api/health`

Returns service status.

```json
{
  "ok": true,
  "redis": { "configured": true, "reachable": true },
  "database": { "configured": true, "reachable": true }
}
```

---

## Content

### `GET /api/slokas`

Query params: `q` (search), `chapter`, `tag`, `limit` (default 20).

```json
{
  "slokas": [{ "id": 1, "chapter": 1, "verse_number": 1, "...": "..." }],
  "total": 12
}
```

### `GET /api/slokas/[id]`

Single verse by numeric id.

### `GET /api/slokas/[id]/story?lang=en|hi`

Cached story for a verse. `POST` with `{ "regenerate": true }` cycles or generates variants.

### `GET /api/moods`

List of mood categories.

### `GET /api/moods/[id]/slokas`

Verses tagged for a mood.

---

## Chat (Madhav)

### `POST /api/chat`

Body:

```json
{
  "language": "en",
  "sessionId": "optional-uuid",
  "messages": [{ "role": "user", "content": "I feel anxious" }]
}
```

Response: Server-Sent Events stream.

Event types: `session`, `citations`, `token`, `replace`, `done`, `error`.

Crisis phrases return a fixed helpline response without calling the LLM.

### `GET /api/chat/sessions`

List recent sessions (last 10) for the authenticated user.

### `GET /api/chat/sessions?sessionId=<uuid>`

Messages for a session (anonymous or owned).

### `GET /api/chat/sessions/[id]`

Same as above by path param.

### `POST /api/chat/merge`

Body: `{ "sessionId": "uuid" }` — attach anonymous session to logged-in user.

---

## User (auth required)

### `GET /api/favorites`

List bookmarked verses.

### `POST /api/favorites`

Body: `{ "slokaId": 47 }`

### `DELETE /api/favorites?slokaId=47`

Remove bookmark.

### `GET /api/journal`

List journal reflections.

### `POST /api/journal`

Body: `{ "slokaId": 47, "reflection": "..." }`

### `GET /api/account/streak`

Current visit streak.

### `POST /api/account/streak`

Record today's visit and return updated streak.

### `GET /api/account/export`

Download a JSON export of the signed-in user's favorites, reflections, streak, and Madhav chat sessions.

### `GET /api/votd/email`

`{ "configured": true|false, "enabled": true|false }` — Resend setup + the signed-in user’s preference (defaults to enabled).

### `POST /api/votd/email`

Email today’s verse (Sanskrit, transliteration, EN/HI, meaning, word meanings, story, links) to the signed-in user’s address. Requires `RESEND_API_KEY`. Honors Account settings opt-out (`403` if disabled). Rate-limited.

### `GET /api/account/preferences`

```json
{
  "votdEmailEnabled": true,
  "displayName": "Arjuna",
  "dateOfBirth": "1995-07-21",
  "place": "Delhi",
  "preferredLanguage": "en",
  "about": "...",
  "email": "you@example.com"
}
```

Email is read-only from auth. Apply `004_user_prefs.sql` and `005_user_profile.sql` if columns are missing.

### `PATCH /api/account/preferences`

Body (any subset): `{ "votdEmailEnabled", "displayName", "dateOfBirth", "place", "preferredLanguage", "about" }`

---

## Share images

### `GET /api/og/verse/[id]`

Open Graph image (1200×630) for a verse.

### `GET /api/og/story/[id]?lang=en|hi`

Open Graph image for a story excerpt.

---

## Rate limits

Chat and story generation are rate-limited per IP via Upstash Redis when configured.

---

## Content source

Set `CONTENT_SOURCE=db` with Supabase configured to serve verses from Postgres. Default `json` reads `data/slokas.json` locally.
