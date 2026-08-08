# Meditation course (progressive sits)

Peer to scripture **sādhana** — not japa, not a Calm marketplace. Free forever.

## Product

| Surface | Role |
|---------|------|
| `/meditation` | Progressive sitting course hub + one-off dailies |
| `/sadhana` | Verse + silent sit + reflection (Gita) |
| `/paths` | Themed multi-day Gita journeys |

**Unlock:** Day N+1 opens only after Day N is completed (server-enforced on complete). Missing a calendar day never resets course progress. Streaks use the shared grace-day model (`practice = 'meditation'` on `sadhana_streaks`).

**v1 audio:** On-device TTS + timed silence (scripts in `data/`). `audio_url` is reserved for recorded audio (prefer **CC BY-SA**); player falls back to TTS when null.

## Sitting course (composed)

One journey id: **`sitting-course`**. Progress on `journey_runs`. Legacy `foundation-7` / `meditation-21` runs are unioned on read.

| Segment file | Days | Tier | Duration |
|--------------|------|------|----------|
| [`data/meditation/foundation-7.json`](../data/meditation/foundation-7.json) | 1–7 | foundation | 6–9 min |
| [`data/journeys/meditation-21.json`](../data/journeys/meditation-21.json) | 8–21 | habit | 9–20 min |
| [`data/journeys/meditation-45.json`](../data/journeys/meditation-45.json) | 22–45 | deepening | 20–25 min |
| [`data/meditation/daily-sits.json`](../data/meditation/daily-sits.json) | — | daily | always unlocked |

Mobile mirrors under `MindKshetra-app/src/data/meditation/`.

**Milestones (private):** day 7, 21, 45 — no public leaderboards.

## Schema

- `meditation_completions` — mood_before / mood_after + `client_ref` (migration 018)
- `journey_runs` — unlock state for `sitting-course` (migration 019)
- Legacy `meditation_runs` kept in sync for one release

## APIs

- `GET /api/meditation/catalog` — composed program + dailies
- `GET /api/meditation/progress?program=sitting-course`
- `POST /api/meditation/complete` — unlock enforced; returns `milestone`
- `POST /api/meditation/merge` — guest queue replay
- Journeys: `GET|POST /api/journeys/sitting-course/run`

## Later (after retention)

- Volunteer recorded audio + CDN + offline download
- Tier 3 goal tracks (`track`: anxiety / sleep / focus / stress) — see `data/meditation/goal-tracks.md`
- Soft bell at sit end — players call `playSoftBell()` (`ambient/soft-bell.m4a`); fails soft if missing

## Impact

See [impact-metrics.md](impact-metrics.md) § Meditation course.
