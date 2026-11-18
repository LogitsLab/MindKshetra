# Meditation course (progressive sits)

Peer to scripture **sādhana** — not japa, not a Calm marketplace. Free forever.

## Product

| Surface | Role |
|---------|------|
| `/meditation` | Opens on Daily sit, Silent timer, and Sleep tonight, then the sitting path |
| `/meditation/silent` | Remembered silent timer (5–45 min, bell, optional interval) |
| `/meditation/library` | Four CC0 sleep beds with a fade |
| `/meditation/sleep/[day]` | Seven evenings, one night unlocks the next |
| `/meditation/credits` | HoliznaCC0 credits |
| `/sadhana` | Verse + silent sit + reflection (Gita) |
| `/paths` | Themed multi-day Gita journeys |

**Unlock:** Day N+1 opens only after Day N is completed (server-enforced on complete). Missing a calendar day never resets course progress. Streaks use the shared grace-day model (`practice = 'meditation'` on `sadhana_streaks`).

**Audio:** Sitting path stays on-device TTS when `audio_url` is null, plus the original drone, bowls, rain, and soft bell. Sleep beds are HoliznaCC0 (CC0 1.0) under `public/audio/meditation/`, credited on `/meditation/credits` and in `data/meditation/AUDIO-CREDITS.md`. UCLA, Free Mindfulness, Pixabay, MindPod, and Longgame are not shipped.

**Stats:** This device keeps `mindkshetra-meditation-stats` (today and lifetime minutes and sits, daily goal 20). Signed-in minutes come from `sadhana_sessions.duration_sec` for `practice = meditation`. Achievement days are distinct IST dates on `meditation_completions`, not a raw row count.

## Sitting course (composed)

One journey id: **`sitting-course`**. Progress on `journey_runs`. Legacy `foundation-7` / `meditation-21` runs are unioned on read.

| Segment file | Days | Tier | Duration |
|--------------|------|------|----------|
| [`data/meditation/foundation-7.json`](../data/meditation/foundation-7.json) | 1–7 | foundation | 6–9 min |
| [`data/journeys/meditation-21.json`](../data/journeys/meditation-21.json) | 8–21 | habit | 9–20 min |
| [`data/journeys/meditation-45.json`](../data/journeys/meditation-45.json) | 22–45 | deepening | 20–25 min |
| [`data/meditation/daily-sits.json`](../data/meditation/daily-sits.json) | — | daily | always unlocked |
| [`data/meditation/tracks/sleep-7.json`](../data/meditation/tracks/sleep-7.json) | 7 evenings | goal / sleep | 8–12 min, CC0 bed |

Mobile mirrors under `MindKshetra-app/src/data/meditation/`.

**Milestones (private):** day 7, 21, 45 — no public leaderboards.

## Schema

- `meditation_completions` — mood_before / mood_after + `client_ref` (migration 018)
- `journey_runs` — unlock state for `sitting-course` (migration 019)
- Legacy `meditation_runs` kept in sync for one release

## APIs

- `GET /api/meditation/catalog` — sitting course, dailies, sleep library, and sleep-7
- `GET /api/meditation/progress?program=sitting-course`
- `POST /api/meditation/complete` — sitting days, silent ids (`silent-10`), sleep beds (`sleep-bed-…`), and sleep-7. Goal-tier sleep days advance `journey_runs` id `sleep-7`, not the sitting course. Mood may be omitted.
- `POST /api/meditation/merge` — guest queue replay
- Journeys: `GET|POST /api/journeys/sitting-course/run`

## Later (after retention)

- Volunteer recorded audio + CDN + offline download
- Anxiety, focus, and stress goal tracks stay deferred. Sleep · 7 evenings has shipped.
- Soft bell at sit end — players call `playSoftBell()` (`ambient/soft-bell.m4a`); fails soft if missing

Lock-screen playback for sleep needs an EAS build (`UIBackgroundModes: audio`, `enableBackgroundPlayback`). Until that binary is installed, the silent timer keeps the screen awake and sleep audio is a stream, not a file inside the app.

## Impact

See [impact-metrics.md](impact-metrics.md) § Meditation course.
