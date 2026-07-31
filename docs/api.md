# MindKshetra API

REST JSON endpoints for web and future mobile clients. Base URL: `NEXT_PUBLIC_SITE_URL` (e.g. `https://mindkshetra.app`).

## Auth

User-specific routes use Supabase session cookies (web) or `Authorization: Bearer <access_token>` (mobile). Both are handled in `lib/supabase/server.ts` — when a Bearer token is present it takes precedence over cookies.

`/api/*` responses include CORS headers (`Access-Control-Allow-Origin: *`, `Authorization` allowed) so Expo web and native clients can call the API.

Anonymous chat sessions work without auth; pass `sessionId` from the chat stream to restore history.

### Web auth callback

Magic links and OAuth return to `/auth/callback`, which exchanges the PKCE `code` for a session cookie, then redirects to `/account` (or `?next=`).

If Supabase falls back to Site URL (missing Redirect URL allowlist entry), the app may see `/?code=…`. Middleware forwards that to `/auth/callback` automatically.

Configure these Redirect URLs in Supabase → Authentication → URL Configuration:

- `http://localhost:3000/auth/callback`
- `https://mind.logitslab.com/auth/callback`
- `https://mindkshetra.vercel.app/auth/callback`
- `mindkshetra://auth/callback`
- `exp://127.0.0.1:8081/--/auth/callback` (local Expo Go)

### Mobile deep links (Supabase Auth)

Configure these redirect URLs in the Supabase dashboard for the Expo app:

- `mindkshetra://auth/callback`
- `exp://127.0.0.1:8081/--/auth/callback` (local Expo Go)
- Production Expo scheme URL once published

Enable Apple Sign-In in Supabase Auth providers when shipping iOS with Google OAuth.

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

Download a JSON export of the signed-in user's favorites, reflections, streak, Madhav chat sessions, reading progress, sadhana log + streaks, public profile, block list, push-token metadata (never the raw token — it's a device push credential), and full preferences (incl. timezone and notification settings).

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

---

## Practice & community (nonprofit pivot, dev branch)

### `GET /api/sadhana?tz=<iana>`

Practice summary for the authed user (anonymous sessions included): `{ today, doneToday: ("flow"|"japa"|"sit"|"pranayama")[], streaks: [{practice, current, longest, lastDay}] }`.

### `POST /api/sadhana`

Log a practice session. Body `{ practice, occurredOn?, durationSec?, count?, details?, clientRef? (uuid), timezone? }` → `{ ok, occurredOn, streak: {current, longest, graceUsedToday?} }`. A one-day gap consumes one grace per rolling week instead of resetting the streak.

### `POST /api/sadhana/merge`

Replay a device-local guest log after sign-in. Body `{ sessions: [{practice, occurredOn, durationSec?, count?, clientRef}], timezone? }` → `{ merged, received, capped, streaks }`. Idempotent via `(user_id, client_ref)` — `merged` counts rows actually written (a replay reports 0); at most 200 sessions are considered per call, so when `capped` is true chunk and resend the remainder. Keep the local log on any non-200.

### `GET /api/panchang?date&lat&lng`

Daily panchang (defaults to New Delhi). Elements read at local sunrise (Hindu rising, Lahiri ayanamsa) with tithi/nakshatra end times, sunrise/sunset, ekadashi/purnima/amavasya flags. Cached per day + rounded location.

### `GET /api/panchang/calendar?month=YYYY-MM&lat&lng`

Month of computed observances: ekadashis, purnima, amavasya, sankrantis. Named-festival table is deliberately deferred.

### `POST /api/astrology/compatibility`

(Existing endpoint, now ungated — the paywall was removed with the nonprofit decision. 402 no longer occurs.)

### `POST /api/moods/order`

Chart-aware mood ordering for a saved member: `{ memberId }` → `{ order: string[], basis: [{lifeArea, score}] }`. Fail-soft contract: clients keep the static order on any error.

### `GET|PUT|DELETE /api/profile` · `GET /api/profiles/[handle]`

Opt-in public profile (signed-in, non-anonymous). PUT screens display name/bio; handles are `[a-z0-9_]{3,24}` minus a reserved list. Public read via `/api/profiles/[handle]` and the `/u/[handle]` page.

### `PATCH /api/journal/[id]`

Share or unshare a journal reflection. Body `{ "visibility": "shared" | "private", "language"?: "en" | "hi" }`. Sharing screens the text first: clean → `{ shared: true }`; held for review → `{ shared: false, held: true }` (crisis holds also return the helpline `message`); links/over-length → `400`. Returns `503` when sharing is paused (`COMMUNITY_REFLECTIONS_ENABLED=0`); unsharing (`"private"`) always works.

### `POST /api/report` · `GET|POST|DELETE /api/blocks`

Report content into the human review queue (signed-in, 20/day) and manage a personal block list. A repeat report of the same content by the same user while the first is still open returns `202` without adding a queue row. Returns `503` when reporting is paused (`COMMUNITY_REPORTS_ENABLED=0`).

### `POST|DELETE /api/push/register` · `GET /api/cron/push-dispatch`

Expo push token registry and the half-hourly dispatcher (GitHub Actions cron, `CRON_SECRET` Bearer). Kinds: `daily_verse` at the user's chosen local hour, `streak_reminder` at 20:00 local; `push_sends` makes reruns idempotent.

### `GET /api/votd/today`

Response now includes optional `nakshatra` (e.g. `"Rohini"`) when the day's verse was selected by the Moon's nakshatra.
