# Goal tracks (Tier 3) — deferred

Optional themed sit tracks after the progressive sitting course. Schema
already reserves `journey_runs.track` and `MeditationSession.track`:

`anxiety` | `sleep` | `focus` | `stress`

## Rules (when stewarded)

- Free forever — never a paywalled library
- Prefer short open sits or a chained mini-course (7 days), not a marketplace
- EN + HI authored together; named content steward before shipping
- Reuse the sitting player (`phases` + TTS / eventual `audio_url`)
- Do not ship until Day 1→21 retention looks healthy (see impact-metrics)

## Stub shape

Drop JSON under `data/meditation/tracks/<track>-7.json` with the same
session shape as foundation days (`tier: "goal"`, `track` set). Wire into
catalog only after review — composition is intentionally not automatic yet
(the journeys loader only scans `data/meditation/*.json`, not `tracks/`).

## Present on disk

| File | Status |
|------|--------|
| `data/meditation/tracks/anxiety-7.json` | Content stub (7 short sits). Loadable via `loadGoalTrack("anxiety-7")` in `lib/meditation.ts`. **Not** in `/api/meditation/catalog` and **not** composed into `sitting-course`. |

App mirror note: `MindKshetra-app/src/data/meditation/goal-tracks.md`.
