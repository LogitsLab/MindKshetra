# Meditation course (progressive sits)

Peer to scripture **sādhana** — not japa, not a Calm marketplace. Free forever.

## Product

| Surface | Role |
|---------|------|
| `/meditation` | Foundation-7 course hub + one-off dailies |
| `/sadhana` | Verse + silent sit + reflection (Gita) |
| `/paths` | Themed multi-day Gita journeys |

**Unlock:** Day N+1 opens only after Day N is completed. Missing a calendar day never resets course progress. Streaks use the shared grace-day model (`practice = 'meditation'` on `sadhana_streaks`).

**v1 audio:** On-device TTS + timed silence (scripts in `data/meditation/`). `audio_url` is reserved for Phase 2 volunteer recordings (prefer **CC BY-SA**).

## Content files

- [`data/meditation/foundation-7.json`](../data/meditation/foundation-7.json) — Days 1–7
- [`data/meditation/daily-sits.json`](../data/meditation/daily-sits.json) — always-unlocked short sits

Mobile mirrors copies under `MindKshetra-app/src/data/meditation/`.

## Schema

Migration [`018_meditation_progress.sql`](../supabase/migrations/018_meditation_progress.sql):

- `meditation_runs` — unlock state per `program_id`
- `meditation_completions` — mood_before / mood_after + `client_ref`
- Extends sadhana practice check to include `meditation`

Apply on MindKshetra-dev before soak:

```bash
npm run db:migrate -- <dev-project-ref>
```

## APIs

- `GET /api/meditation/catalog`
- `GET /api/meditation/progress?program=foundation-7`
- `POST /api/meditation/complete`
- `POST /api/meditation/merge` — guest queue replay

## Phase 2 (after Tier 1 retention)

- Days 8–28 habit course content
- Recorded audio + CDN + offline download
- Tier 3 goal tracks (anxiety / sleep / focus / stress)
- Named content steward before scaling scripts/languages

## Impact

See [impact-metrics.md](impact-metrics.md) § Meditation course.
