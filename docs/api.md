# MindKshetra API

REST JSON endpoints for the web app and the Expo mobile app. Base URL is
`NEXT_PUBLIC_SITE_URL` — production `https://mind.logitslab.com`, dev site
`https://dev-mind.logitslab.com`, local `http://localhost:3000`.

The mobile client `MindKshetra-app/src/api/endpoints.ts` (in the
[MindKshetra-app](https://github.com/LogitsLab/MindKshetra-app) repo) is the
**living reference consumer** of this API — when this document and that file
disagree, one of the two needs a PR.

This document describes responses **as they are actually returned**. There is
no uniform response envelope: some endpoints return bare arrays or objects,
others wrap (`{ slokas }`, `{ entries }`, `{ profile }`…), and a few field
names are snake_case because rows pass through from Postgres. Where shapes are
inconsistent, this doc says so instead of papering over it. See
[Errors & limits contract](#errors--limits-contract).

## Auth

Four auth levels appear below:

| Level | Meaning |
|---|---|
| public | No credentials needed. |
| auth (anonymous OK) | Any Supabase user, including anonymous sign-ins (`getAuthUserId`). |
| signed-in | Non-anonymous Supabase user only (`getSignedInUserId`). |
| CRON_SECRET / maintainer | Operational endpoints — see [Operational endpoints](#operational-endpoints-cron--admin). |

User routes accept Supabase session cookies (web) or
`Authorization: Bearer <access_token>` (mobile). Both are handled in
`lib/supabase/server.ts` — a Bearer token takes precedence over cookies.

`/api/*` responses include CORS headers (`Access-Control-Allow-Origin: *`,
`Authorization` allowed) so Expo web and native clients can call the API.
The middleware additionally rejects cookie-authenticated **cross-site writes**
with `403 { "error": "Cross-site request rejected" }` (CSRF guard); Bearer
clients and cookie-less callers are unaffected.

Anonymous chat works without auth; pass the `sessionId` from the chat stream
to restore history.

### Web auth callback

Magic links and OAuth return to `/auth/callback`, which exchanges the PKCE
`code` for a session cookie, then redirects to `/account` (or `?next=`).

If Supabase falls back to Site URL (missing Redirect URL allowlist entry), the
app may see `/?code=…`. Middleware forwards that to `/auth/callback`
automatically.

Configure these Redirect URLs in Supabase → Authentication → URL Configuration:

- `http://localhost:3000/auth/callback`
- `https://mind.logitslab.com/auth/callback`
- `https://dev-mind.logitslab.com/auth/callback` (dev site)
- `mindkshetra://auth/callback`
- `exp://127.0.0.1:8081/--/auth/callback` (local Expo Go)

### Mobile deep links (Supabase Auth)

Configure these redirect URLs in the Supabase dashboard for the Expo app:

- `mindkshetra://auth/callback`
- `exp://127.0.0.1:8081/--/auth/callback` (local Expo Go)
- Production Expo scheme URL once published

Enable Apple Sign-In in Supabase Auth providers when shipping iOS with Google
OAuth.

---

## Errors & limits contract

### Error body

The error body used across routes is:

```json
{ "error": "human-readable message" }
```

Real deviations, documented rather than hidden:

- **Some 429s return `{ "ok": false }` with no `error` field** — the
  principal-keyed community/write routes (`/api/moods/order`,
  `/api/journal/[id]` PATCH, `/api/profile` PUT, `/api/blocks` POST,
  `/api/report`, `/api/events`, `/api/push/register` POST,
  `/api/astrology/practice-card`). These are fire-and-forget or fail-soft
  surfaces; clients treat any non-200 as "keep local state / render nothing".
- **`GET /api/slokas/[id]/reflections` returns `{ "reflections": [] }` at
  429** — the success shape, empty, so list renderers degrade without a
  special case.
- Some 404s carry extra fields: incognito chart-session misses return
  `{ "error", "reason": "expired" | "cache-unavailable", "recoverable": true }`
  (see `/api/astrology/compute`).
- `POST /api/votd/email` provider failures return
  `{ "error", "providerStatus" }` with status 502.
- The OG image routes are not JSON at all: `GET /api/og/verse/[id]` 404s with
  the plain-text body `Not found`.

### Status semantics (as implemented)

| Status | Meaning here |
|---|---|
| 200 | Success. |
| 201 | Created (`POST /api/astrology/members` only). |
| 202 | Accepted, fire-and-forget (`/api/events`, `/api/report` — including the duplicate-open-report case). |
| 400 | Malformed input: bad JSON, missing/invalid fields, screened profile text, over-length or link-bearing share. |
| 401 | Not signed in (`{ "error": "Not signed in" }`), or bad/missing `CRON_SECRET` on cron routes (`{ "error": "Unauthorized" }`). |
| 403 | Forbidden: VOTD email opted out, re-sharing a moderator-removed reflection, cross-site cookie write (CSRF), kill-switched actions that target you specifically. |
| 404 | Not found — **or a deliberately quiet fallback**: non-maintainers get 404 (not 403) from `/api/admin/moderation` so the route's existence isn't advertised; `/api/astrology/practice-card` 404s ("No pressure to read") when the overview should simply stay quiet; incognito chart-session misses 404 with `recoverable: true`. |
| 409 | Conflict (`/api/profile` PUT: handle taken). |
| 422 | Semantically invalid despite well-formed input — e.g. `/api/astrology/compatibility` when a chart lacks a birth time (no moon position, no Ashtakoota). |
| 429 | Rate limited. Body is `{ "error": … }` on most content/astrology routes, `{ "ok": false }` on the community/write routes listed above. A `Retry-After` header is present on most but not all (missing on e.g. `/api/slokas/[id]`, `/api/votd/email`, `/api/account/delete`). |
| 500 | Server error, `{ "error": message }`. **Also currently used for "Groq not configured"** on `/api/chat` and `POST /api/slokas/[id]/story` — arguably should be 503, but 500 is what ships today. |
| 502 | Upstream failure: Nominatim geocoding, Resend send. |
| 503 | Service not configured or paused: Resend missing (`/api/votd/email`, `/api/cron/votd-email`), account deletion without a service-role key, community kill switches (`COMMUNITY_REFLECTIONS_ENABLED=0`, `COMMUNITY_REPORTS_ENABLED=0`), VOTD verse unavailable, non-Swiss ephemeris on `/api/astrology/health`. |

### Rate limits

Sliding window via Upstash Redis when configured, per-instance in-memory
fallback otherwise (`lib/rateLimit.ts`). Keys: **IP** = client IP
(`clientKey`), **user-or-IP** = user id when signed in else IP, **principal** =
`u:<userId>` else `ip:<ip>` (`principalKey` — authenticated writes key on the
user because Indian carrier NAT puts many users behind one IP), **user** =
signed-in user id only.

Numbers below are read from the actual `rateLimit(...)` calls:

| Route | Method | Key | Limit | Window | 429 body |
|---|---|---|---|---|---|
| `/api/chat` | POST | user-or-IP | 20 | 60 s | `{error}` + Retry-After |
| `/api/slokas` | GET | IP | 60 | 60 s | `{error}` + Retry-After |
| `/api/slokas/[id]` | GET | IP | 120 | 60 s | `{error}` (no Retry-After) |
| `/api/slokas/[id]/story` | POST | IP | 12 | 60 s | `{error}` + Retry-After |
| `/api/slokas/[id]/reflections` | GET | IP | 60 | 60 s | `{reflections: []}` |
| `/api/moods/order` | POST | principal | 30 | 60 s | `{ok:false}` |
| `/api/panchang` | GET | IP | 60 | 60 s | `{error}` + Retry-After |
| `/api/panchang/calendar` | GET | IP | 10 | 60 s | `{error}` + Retry-After |
| `/api/astrology/compute` | POST | user-or-IP | 20 | 60 s | `{error}` + Retry-After |
| `/api/astrology/predictions` | POST | user-or-IP | 10 | 60 s | `{error}` + Retry-After |
| `/api/astrology/compatibility` | POST | principal | 20 | 60 s | `{error}` + Retry-After |
| `/api/astrology/geocode` | POST | IP | 30 | 60 s | `{error}` + Retry-After |
| `/api/astrology/resolve-birth` | POST | IP | 40 | 60 s | `{error}` + Retry-After |
| `/api/astrology/members` | POST | user | 20 | 60 s | `{error}` + Retry-After |
| `/api/astrology/practice-card` | POST | principal | 30 | 60 s | `{ok:false}` |
| `/api/sadhana` | POST | principal | 60 | 60 s | `{error}` + Retry-After |
| `/api/sadhana/merge` | POST | principal | 10 | 60 s | `{error}` + Retry-After |
| `/api/journal/[id]` | PATCH | principal | 30 | 1 h | `{ok:false}` |
| `/api/profile` | PUT | principal | 10 | 1 h | `{ok:false}` |
| `/api/blocks` | POST | principal | 30 | 1 h | `{ok:false}` |
| `/api/report` | POST | principal | 20 | 24 h | `{ok:false}` |
| `/api/events` | POST | principal | 60 | 60 s | `{ok:false}` |
| `/api/push/register` | POST | principal | 10 | 60 s | `{ok:false}` |
| `/api/votd/email` | POST | IP | 3 | 1 h | `{error}` (no Retry-After) |
| `/api/account/delete` | POST | IP | 5 | 60 s | `{error}` (no Retry-After) |

Unlisted routes (including every GET not in the table, e.g.
`GET /api/slokas/[id]/story`) have **no** route-level rate limit.

---

## Health & status

### `GET /api/health` — public

```json
{
  "ok": true,
  "contentSource": "db",
  "redis": { "configured": true, "reachable": true, "missingOnVercel": false },
  "database": { "configured": true, "reachable": true }
}
```

`contentSource` is `"db"` or `"json"`.

### `GET /api/astrology/health` — public (operational monitor)

Ephemeris health. 200 only when the Swiss ephemeris is active:

```json
{ "ok": true, "sweph": true, "ephemeris": { "mode": "swiss", "...": "reason, path, files, downgrade count" }, "...": "sun-longitude probe fields" }
```

Returns **503** with the same shape (`ok: false`) when the engine has silently
downgraded to Moshier — machine-checkable, and the reason CLAUDE.md says to
verify this against production, never a build step. 500
`{ ok: false, sweph: false, error }` if the engine throws.

---

## Gita content & Verse of the Day

### `GET /api/slokas` — public

Query params: `q` (search) or `chapter`. **Three different success shapes:**

- `?q=` with hits → `{ "results": Sloka[] }` (max 40)
- `?q=` with no hits → `{ "results": [], "nearest": Sloka[], "didYouMean": string[] }`
- `?chapter=N` → bare `Sloka[]` (no wrapper)
- no params → bare `Sloka[]` (all 701 verses)

400 for a non-integer chapter. A `Sloka` is:

```json
{
  "id": 1, "chapter": 1, "verse_number": 1,
  "sanskrit_devanagari": "…", "transliteration_iast": "…",
  "hindi_translation": "…", "english_translation": "…",
  "english_meaning": "…", "hindi_meaning": "…",
  "word_meanings": { "…": "…" }, "tags": ["…"]
}
```

### `GET /api/slokas/[id]` — public

Bare `Sloka` object (no wrapper). 400 invalid id, 404 not found.

### `GET /api/slokas/[id]/story?lang=en|hi` — public

Story/scene for the verse's teaching passage. All responses carry passage
metadata (`passage`, `unitId`, `mode`, `titleEn`, `titleHi`) plus:

- curated scene → `{ "story", "cached": true, "seeded": true, "curated": true, "variant": 1, "total": 1, "language" }`
- cached story → `{ "story", "cached": true, "seeded", "curated": false, "variant", "total", "language" }`
- nothing cached → `{ "story": null, "cached": false }`

### `POST /api/slokas/[id]/story` — public

Body `{ "regenerate": true }` cycles or generates variants (Groq). Success
adds `"generated": true|false` to the GET shape. Without `GROQ_API_KEY` it
falls back to the curated scene when one exists, otherwise **500**
`{ "error": "GROQ_API_KEY is not configured" }`.

### `GET /api/moods` — public

Bare array of moods: `[{ "id", "label", "labelHi", "tags" }]`.

### `GET /api/moods/[id]/slokas` — public

`{ "mood": Mood, "slokas": Sloka[] }` (max 40). 404 unknown mood.

### `GET /api/votd/today` — public

Server-authoritative verse of the day (mobile must not derive its own):

```json
{ "id": 47, "ref": "2.47", "date": "2026-08-01", "nakshatra": "Rohini" }
```

`nakshatra` is present only when the pick was moon-driven. `?full=1` adds the
full `"sloka"` object. 503 `{ "error": "Verse unavailable" }` if no verse
resolves.

---

## Chat (Madhav)

### `POST /api/chat` — public; sessions persist for auth'd users

Body:

```json
{
  "language": "en",
  "chatSessionId": "optional-uuid",
  "incognito": false,
  "messages": [{ "role": "user", "content": "I feel anxious" }],
  "memberId": "optional — chart-linked reply",
  "chartSessionId": "optional — chart-linked reply",
  "birth": { "optional": "chart-linked reply" }
}
```

`sessionId` is still accepted as a deprecated alias for `chatSessionId`.
Last user message max 2000 chars (400 above that). Response is a
**Server-Sent Events stream**; each `data:` line is JSON with a `type`:
`session`, `citations`, `token`, `replace`, `done`, `error`.

- Crisis phrases return a fixed helpline reply without calling the LLM.
- When `memberId` / `chartSessionId` / `birth` is present the reply is
  astrology-only (no Gita verses); if the chart can't be loaded → 404
  `{ "error": "Chart not found" }`.
- 400 invalid JSON / missing messages; **500** (not 503) when `GROQ_API_KEY`
  is unset.

### `GET /api/chat/sessions` — public

- `?sessionId=<uuid>` → `{ "sessionId", "messages" }`. The session id acts as
  a capability — anyone holding it can read the transcript (this is how
  anonymous sessions are restored).
- no param → `{ "sessions": [{ "id", "title", "created_at", "updated_at" }] }`
  (last 10) for the auth'd user; `{ "sessions": [] }` signed out.

### `GET /api/chat/sessions/[id]` — public

Same as the query-param form: `{ "sessionId", "messages" }`. Messages include
`reading` / `chart_context` when a chart voice was persisted.

### `POST /api/chat/merge` — auth (anonymous OK)

Body `{ "sessionId": "uuid" }` — attach an anonymous session to the current
user. `{ "ok": true }`; 400 missing id, 401 signed out.

### `POST /api/astrology/chat` — deprecated shim

Forwards to `POST /api/chat` (identical contract). Kept for one deploy's
worth of old clients; slated for removal.

---

## Reading progress

All progress routes require **signed-in** (non-anonymous) except
`/api/progress/resolve`.

### `GET /api/progress`

```json
{ "cursor": { "slokaId": 47, "chapter": 2, "updatedAt": "…" }, "completedIds": [1, 2], "continueSlokaId": 48 }
```

### `POST /api/progress/complete`

Body `{ "slokaId": 47, "completed": true }` or bulk
`{ "slokaIds": [1, 2, 3], "completed": true }` → `{ "ok": true }`.

### `PUT /api/progress/cursor`

Body `{ "slokaId": 47 }` → `{ "ok": true }`.

### `POST /api/progress/merge`

Replay guest progress after sign-in. Body
`{ "cursor": { "slokaId", "chapter"? } | null, "completedIds": [] }` → the
full progress snapshot (same shape as `GET /api/progress`).

### `POST /api/progress/resolve` — public

Resolve the continue target for guest localStorage progress. Body
`{ "cursorSlokaId": 47, "completedIds": [] }` → `{ "continueSlokaId": 48 }`.
Never errors — invalid input answers `{ "continueSlokaId": null }` with 200.

---

## Favorites & journal

### `GET /api/favorites` — auth (anonymous OK)

- no params → `{ "slokas": Sloka[] }` (full verse objects, newest first)
- `?slokaId=47` → `{ "saved": true }` (existence check)

### `POST /api/favorites` — auth (anonymous OK)

Body `{ "slokaId": 47 }` → `{ "ok": true }`.

### `DELETE /api/favorites?slokaId=47` — auth (anonymous OK)

`{ "ok": true }`.

### `GET /api/journal` — auth (anonymous OK)

`{ "entries": [{ "id", "sloka_id", "reflection", "created_at" }] }` — last 50,
**snake_case** row fields.

### `POST /api/journal` — auth (anonymous OK)

Body `{ "slokaId": 47, "reflection": "…" }` → `{ "id": 123 }`.

### `PATCH /api/journal/[id]` — signed-in · 30/h

Share or unshare a reflection. Body
`{ "visibility": "shared" | "private", "language"?: "en" | "hi" }`.

- unshare → `{ "shared": false }` (always works, even kill-switched)
- share, clean → `{ "shared": true }`
- share, held for review → `{ "shared": false, "held": true }`; crisis holds
  add `"crisis": true` and the helpline `"message"`
- share, rejected (links / over-length) → 400
- share a moderator-removed entry → 403
- sharing paused (`COMMUNITY_REFLECTIONS_ENABLED=0`) → 503

### `DELETE /api/journal/[id]` — signed-in

`{ "ok": true }`. Note the asymmetry: creating a journal entry allows
anonymous users, deleting one requires a non-anonymous sign-in.

---

## Sadhana (practice log)

### `GET /api/sadhana?tz=<iana>` — auth (anonymous OK)

Signed out → `{ "today": null, "doneToday": [], "streaks": [] }` (200, no
error). Auth'd:

```json
{ "today": "2026-08-01", "doneToday": ["japa"], "streaks": [{ "practice": "japa", "current": 3, "longest": 9, "lastDay": "2026-08-01" }] }
```

Practices: `"flow" | "japa" | "sit" | "pranayama"`.

### `POST /api/sadhana` — auth (anonymous OK) · 60/min

Body `{ "practice", "occurredOn"?, "durationSec"?, "count"?, "details"?, "clientRef"? (uuid), "timezone"? }` →

```json
{ "ok": true, "occurredOn": "2026-08-01", "streak": { "current": 4, "longest": 9, "graceUsedToday": false } }
```

A one-day gap consumes one grace per rolling week instead of resetting the
streak. 400 `{ "error": "Unknown practice" }`.

### `POST /api/sadhana/merge` — signed-in · 10/min

Replay a device-local guest log. Body
`{ "sessions": [{ "practice", "occurredOn", "durationSec"?, "count"?, "clientRef" }], "timezone"? }`
→ `{ "merged", "received", "capped", "streaks" }`. Idempotent via
`(user_id, client_ref)` — a pure replay reports `merged: 0`. At most 200
sessions are considered per call; when `capped` is true, chunk and resend the
remainder. Keep the local log on any non-200.

---

## Panchang

### `GET /api/panchang?date&lat&lng` — public · 60/min

Daily panchang, computed at local sunrise (Hindu rising, Lahiri ayanamsa)
with tithi/nakshatra end times, sunrise/sunset, ekadashi/purnima/amavasya
flags. Location defaults to New Delhi; invalid coords silently fall back to
the default rather than erroring. Bare panchang object (no wrapper). Cached
per day + ~11 km rounded location.

### `GET /api/panchang/calendar?month=YYYY-MM&lat&lng` — public · 10/min

Month of computed observances: ekadashis, purnima, amavasya, sankrantis. Bare
calendar object. Tighter limit because a cold month walks ~30 daily panchangs
through the ephemeris. Named-festival table is deliberately deferred.

---

## Astrology

Two chart modes share one contract (`lib/astrology/incognito.ts`):

- **Member mode** (signed-in): charts belong to saved `astrology_members`
  rows and persist in `astrology_chart_cache`.
- **Incognito mode** (public): the chart lives in Redis under a
  **server-minted** `chartSessionId` (uuid v4 — client-supplied ids are
  rejected; the id is the cache key for someone's birth details). On a cache
  miss the response is 404 with `"recoverable": true` and a `"reason"` of
  `"expired"` (TTL elapsed) or `"cache-unavailable"` (no shared Redis) — the
  client should re-send `birth`, which it holds locally.

`sessionId` is echoed alongside `chartSessionId` as a deprecated alias.

### `POST /api/astrology/compute` — public / signed-in for members · 20/min

Body is one of:

- `{ "memberId": "…", "asOfDate"? }` (signed-in) →
  `{ "memberId", "chart", "persisted": true, "cached": true|false }`
- `{ "chartSessionId": "…", "birth"?, "asOfDate"? }` →
  `{ "chartSessionId", "sessionId", "chart", "persisted": false }` or the
  recoverable 404 above
- a raw birth payload
  `{ "dob": "YYYY-MM-DD", "tob": "HH:MM"|null, "tobUnknown"?, "lat", "lng", "placeLabel", "ianaTz"? }`
  → mints a new `chartSessionId` and returns the incognito shape

401 for `memberId` while signed out; 404 unknown member; 400 invalid
payload/session id.

### `POST /api/astrology/predictions` — public / signed-in for members · 10/min

Same three input modes plus `{ "language"?: "en"|"hi", "force"?: bool }`.
Returns `{ "chart", "cached"?, "source" }` where `chart.predictionsText`
holds the write-up and `source` is `"llm"` or a fallback marker; incognito
responses echo `chartSessionId`/`sessionId`; the birth-only mode omits
`cached`. Cached write-ups are reused unless `force` or the language differs.
Same recoverable-404 contract as compute. Long Groq completion —
`maxDuration 60`.

### `POST /api/astrology/compatibility` — signed-in · 20/min

Kundli Milan between two **saved members only** — raw birth payloads are
deliberately not accepted (that would be an open scoring endpoint for
anyone's details). Body `{ "memberA": id, "memberB": id }` → `{ "result" }`.
**422** when either chart lacks a moon position (missing birth time) — a
zero score would read as "incompatible", so it refuses instead. 404 unknown
member, 400 same-member or missing ids. The old paywall is gone — 402 no
longer occurs.

### `POST /api/astrology/geocode` — public · 30/min

Body `{ "query": "Delhi", "limit"? }` →
`{ "results": [{ "label", "lat", "lng", "ianaTz" }] }` via OpenStreetMap
Nominatim. 400 query under 2 chars; **502** on upstream failure.

### `POST /api/astrology/resolve-birth` — public · 40/min

Resolve a birth instant without casting a chart. Body: the raw birth payload
(above) →

```json
{ "placeLabel", "lat", "lng", "ianaTz", "utcOffsetMinutes", "utcIso", "localIso" }
```

400 with the validation message on invalid input.

### `GET /api/astrology/members` — signed-in

`{ "members": [{ …member, "currentMahaLord": "Saturn"|null }] }`.

### `POST /api/astrology/members` — signed-in · 20/min

Body `{ "name", "relationship"?, "dob", "tob"?, "tobUnknown"?, "gender"?, "lat", "lng", "placeLabel", "ianaTz"? }`
→ **201** `{ "member" }`. 400 missing fields / invalid coordinates / invalid
birth instant.

### `PATCH /api/astrology/members/[id]` — signed-in

Partial update (any subset of the POST fields) →
`{ "member", "warning": "Birth data updated — previous chart cache cleared." }`.
Editing birth data invalidates the chart cache for the current engine
version. 404 not yours / not found.

### `DELETE /api/astrology/members/[id]` — signed-in

Soft delete (`is_active = false`) → `{ "ok": true }`.

### `GET /api/astrology/members/[id]/chart` — signed-in

Cached chart only — never computes. `{ "chart", "engineVersion", "updatedAt" }`;
404 `{ "error": "No cached chart" }` when nothing is cached, 404 for unknown
members.

### `POST /api/astrology/practice-card` — signed-in · 30/min

Pressure → Practice card for a saved member. Body `{ "memberId" }` →

```json
{ "area", "fact", "timing", "actionIndex", "verse": { "id", "ref", "english", "hindi" } }
```

Fail-soft contract (same as `/api/moods/order`): on **any** error — including
the quiet 404s "No pressure to read" / "No verse available" — the client
renders nothing. Verse rotates daily (IST).

### `POST /api/moods/order` — signed-in · 30/min

Chart-aware mood ordering for a saved member. Body `{ "memberId" }` →
`{ "order": string[], "basis": [{ "lifeArea", "score" }] }`. 404 when the
member has no cached chart verdicts yet ("cast the chart first"). Fail-soft:
clients keep the static mood order on any error.

---

## Community: profiles, reflections, reports, blocks

### `GET /api/profile` — signed-in

The caller's own public profile:
`{ "profile": { "handle", "display_name", "bio", "avatar_key", "is_public", "created_at" } | null }`
(snake_case row fields).

### `PUT /api/profile` — signed-in · 10/h

Body `{ "handle", "displayName"?, "bio"?, "avatarKey"?, "isPublic"? }`.
Handles are `[a-z0-9_]{3,24}` minus a reserved list; display name and bio are
screened **before** anything becomes public — a screen hit is a plain 400
(fix and retry), not a hold queue. Omitting `isPublic` keeps the stored
value. Success → `{ "profile" }`; **409** `{ "error": "That handle is taken." }`.

### `DELETE /api/profile` — signed-in

`{ "ok": true }`.

### `GET /api/profiles/[handle]` — public

`{ "profile": { "handle", "display_name", "bio", "avatar_key", "created_at" } }`
for public profiles; 404 otherwise (also rendered at `/u/[handle]`).

### `GET /api/slokas/[id]/reflections` — public · 60/min

Shared reflections on a verse (the only public read path for journal
content):

```json
{ "reflections": [{ "id", "reflection", "sharedAt", "author": { "handle", "displayName" } | null }] }
```

`author: null` renders as "A seeker" — sharing words never forces sharing
identity. When the viewer is signed in, entries from blocked users are
filtered out. At 429 this returns `{ "reflections": [] }`, not an error
body.

Sharing itself is `PATCH /api/journal/[id]` (see Favorites & journal).

### `POST /api/report` — signed-in · 20/24 h

Report content into the human review queue. Body
`{ "contentType": "reflection" | "profile" | "circle_post", "contentId", "reason"? }`
→ **202** `{ "ok": true }`. A repeat report of the same content while the
first is still open also answers 202 without stacking queue rows. 503 when
paused (`COMMUNITY_REPORTS_ENABLED=0`).

### `GET /api/blocks` — signed-in

`{ "blocks": [{ "blocked_user_id", "created_at" }] }` (snake_case).

### `POST /api/blocks` — signed-in · 30/h

Body `{ "blockedUserId": uuid }` → `{ "ok": true }`. 400 invalid uuid or
self-block.

### `DELETE /api/blocks` — signed-in

Body `{ "blockedUserId": uuid }` → `{ "ok": true }`.

---

## Push notifications

### `POST /api/push/register` — auth (anonymous OK) · 10/min

Expo push token registry. Body
`{ "token": "ExponentPushToken[…]", "platform": "ios" | "android" }` →
`{ "ok": true }`. Anonymous users may register — the anonymous id survives
the upgrade to a full account, so tokens follow the person. A user keeps at
most 5 active tokens; the oldest are retired on register.

### `DELETE /api/push/register` — auth (anonymous OK)

Sign-out path: body `{ "token" }` → `{ "ok": true }`. Disables sends to this
device without deleting history.

Dispatch is `GET /api/cron/push-dispatch` — see Operational endpoints.

---

## Account

### `GET /api/account/streak` — public-tolerant

Signed out → `{ "current": 0, "longest": 0 }` (200, **not** a 401 — the one
user route that answers signed-out reads with zeros). Auth'd → the real
`{ "current", "longest" }`.

### `POST /api/account/streak` — auth (anonymous OK)

Record today's visit. Body `{ "timezone"? }` (device IANA zone so the day
boundary is local) → updated `{ "current", "longest" }`.

### `GET /api/account/preferences` — auth (anonymous OK)

Flat preferences object:

```json
{
  "votdEmailEnabled": true, "displayName": "Arjuna", "dateOfBirth": "1995-07-21",
  "place": "Delhi", "preferredLanguage": "en", "about": "…", "timezone": "Asia/Kolkata",
  "email": "you@example.com",
  "notifDailyVerse": false, "notifDailyVerseHour": 8,
  "notifStreakReminder": false, "notifCommunity": true
}
```

`email` is read-only from auth. A failed prefs read answers the defaults with
200 rather than erroring.

### `PATCH /api/account/preferences` — auth (anonymous OK)

Any subset of the fields above (except `email`). Validation 400s:
`notifDailyVerseHour` must be an integer 4–22, `timezone` a valid IANA zone,
`dateOfBirth` a real `YYYY-MM-DD` between 1900 and today; an empty body is
also a 400. Success returns the full updated preferences object. A 500 here
usually means migrations `004`, `005`, `010` are missing (the error message
says which).

### `GET /api/account/export` — auth (anonymous OK)

JSON download (`Content-Disposition: attachment`) of the user's favorites,
reflections, streak, Madhav chats (sessions + messages), sadhana log +
streaks, public profile, block list, push-token **metadata** (never the raw
token — it is a device push credential), reading progress, and full
preferences.

### `POST /api/account/delete` — auth (anonymous OK) · 5/min

Permanent account + data deletion (App Store 5.1.1(v)). Chats are deleted
first, the auth user last, so a partial failure never leaves an account that
can't be re-deleted. `{ "ok": true }`; 503 when no service-role key is
configured.

### `GET /api/votd/email` — public / auth-aware

Resend setup + the caller's opt-in state:
`{ "configured", "enabled", "testingMode", "from", "note"? }` — `note`
appears when `RESEND_FROM` is still the onboarding sender.

### `POST /api/votd/email` — signed-in (email required) · 3/h

Email today's verse to the signed-in user's address. 503 Resend not
configured; 400 anonymous user / no email on file; 403 opted out in
settings; 502 `{ "error", "providerStatus" }` provider failure; success
`{ "ok": true, "ref": "2.47", "to": "you@example.com" }`.

---

## Events

### `POST /api/events` — public (auth attributed when present) · 60/min

Client analytics sink. Body `{ "name", "props"? }` — allowlisted names only,
and the user id comes from auth, never the body. Accepted input answers
**202** `{ "ok": true }`; unknown names 400. Clients fire-and-forget.

---

## Share images (Open Graph)

Not JSON — these return PNG (1200×630) via `@vercel/og`, used by the share
sheets and link unfurls:

### `GET /api/og/verse/[id]` — public

OG card for a verse. 404 is plain text `Not found`, not JSON.

### `GET /api/og/story/[id]?lang=en|hi` — public

OG card for a story excerpt.

---

## Operational endpoints (cron / admin)

These are **not public API** and mobile/web clients must never call them.
They exist for schedulers and maintainers; treat them as infrastructure.

### `GET /api/cron/votd-email` — `Authorization: Bearer <CRON_SECRET>`

Daily VOTD broadcast (Vercel cron, 08:00 IST = `30 2 * * *` UTC).
Recipients: signed-up users with an email who haven't opted out. 401 without
the secret (or when the secret is unset — the route fails closed); 503
without `RESEND_API_KEY`. Success:
`{ "ok", "ref", "recipients", "sent", "failed", "errors"? }`.

### `GET /api/cron/push-dispatch` — `Authorization: Bearer <CRON_SECRET>`

Half-hourly push dispatcher (GitHub Actions cron — Vercel cron is
day-granular on this plan). Cohorts per tick: `daily_verse` at the user's
chosen local hour, `streak_reminder` at 20:00 local when a streak ≥ 2 is at
stake. Idempotent via the `push_sends` ledger — a rerun can skip a user,
never double-ping them. Returns send totals
(`sent`, `attempted`, `stale`, `deduped`, `cohorts`).

### `GET | POST /api/admin/moderation` — maintainers only

Human review queue for held/reported content. Access is via
`MAINTAINER_USER_IDS` (comma-separated Supabase user ids in the
environment); **non-maintainers receive 404, not 403** — the route does not
advertise its existence. GET → `{ "items": [ …queue rows, "preview" ] }`
(reflection text inlined so review needs no SQL). POST
`{ "id", "resolution": "kept" | "removed" | "no_action" }` → `{ "ok": true }`.
Removal flips the reflection's status — it never deletes the author's
private journal entry.

---

## Content source

Set `CONTENT_SOURCE=db` with Supabase configured to serve verses from
Postgres. Default `json` reads `data/slokas.json` locally — the whole corpus
ships in the repo, which is why content endpoints work with zero
configuration.
