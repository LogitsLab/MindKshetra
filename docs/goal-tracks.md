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
catalog only after review — composition is intentionally not automatic yet.
