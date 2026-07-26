# TODOS

Deferred work with enough context to pick up cold. Created 2026-07-26 from
`/plan-ceo-review` (see [docs/designs/gita-jyotish-integration.md](docs/designs/gita-jyotish-integration.md)).

---

## Open review gaps

These came out of the CEO review's failure-mode registry and are **not** covered
by the accepted Phase 1 / Phase 2 scope.

### G1 — Empty astrologer voice has no designed state (P1)

Under the two-voice persona, a chart whose `verdicts.blended` array is empty
leaves one labeled voice with literally nothing to say. Today that path doesn't
exist; after the merge it does, and it renders as a blank labeled block.

- **Where:** the merged prompt builder, and `ChatWindow` layout.
- **Start at:** `lib/astrology/blend.ts` `buildAllVerdicts` — determine when it
  can legitimately return empty, then design the state (suppress the voice
  entirely? or a short honest line?).
- **Depends on:** the Phase 1 merge landing first.
- **Effort:** S human → S with CC.
- **Recommended next step:** resolve inside `/plan-design-review`.

### G2 — Crisis events are log-only, with no alert (P1)

`app/api/chat/route.ts:98` emits `console.warn("[chat] crisis pattern detected")`.
That is a log line, not an alert. For the one event class where a human may need
to know quickly, log-only is the wrong tier.

- **Blocked by:** needs an alerting destination decision (email? Slack? Upstash +
  cron digest?). That decision is why this wasn't scoped.
- **Effort:** S human → S with CC once the destination is chosen.

### G3 — Bridge contribution rate is unmeasured (P2)

No signal for how often a chart actually contributes tags to retrieval versus
producing nothing usable. Without it, the E6 match-reasoning line is the only
feedback that the bridge works at all.

- **Start at:** `lib/bridge/chart-to-verse.ts` (once it exists) — count
  tags-produced vs verdicts-received, emit as a structured log field.
- **Depends on:** Phase 1 bridge.
- **Effort:** S human → S with CC.

### G4 — Outside voice never ran on this plan (P2)

The CEO review's cross-model check did not execute: Codex CLI is not installed
and subagent dispatch was unavailable in that session. The plan has had exactly
one model's review.

- **Fix:** `npm install -g @openai/codex && codex login`, then re-run the outside
  voice against `docs/designs/gita-jyotish-integration.md`.
- **Effort:** S.

---

## Deferred delight items

Surfaced during the CEO review's expansion scan, deliberately deferred at
`D7.final` to keep the two bets readable. All five reuse
`lib/bridge/chart-to-verse.ts`, so each is cheap **after** Phase 1.

### D1 — Nakshatra-driven Verse of the Day (P2)

`lib/astrology/panchang.ts` already computes tithi and nakshatra. Today's verse is
chosen by date hash. Choosing it by today's nakshatra turns a commodity feature
into one no competitor can copy.

- **Start at:** `lib/astrology/panchang.ts`, `app/verse-of-the-day/page.tsx`.
- **Depends on:** the bridge (needs nakshatra → verse theme mapping).
- **Effort:** S human → S with CC.

### D2 — Dasha-period bookmark payoff (P3)

"You saved this verse during your Saturn mahadasha," surfaced when that period
ends. Emotional payoff from data already stored — favorites have timestamps and
`lib/astrology/dasha.ts` knows period boundaries.

- **Start at:** `lib/astrology/dasha.ts`, `/api/favorites`.
- **Depends on:** nothing beyond existing data.
- **Effort:** M human → S with CC.

### D3 — Chart-aware mood ordering (P3)

Order the 18 moods in `lib/moods-data.ts` by which life areas are currently under
pressure in the signed-in member's chart, so the grid greets a person rather than
a database.

- **Start at:** `components/MoodGrid.tsx`, `lib/bridge/chart-to-verse.ts`.
- **Depends on:** Phase 1 bridge.
- **Effort:** S human → S with CC.

### D4 — Birth-time rectification hint (P2)

`app/api/astrology/resolve-birth/route.ts` exists. Unknown birth time is the
single largest onboarding drop-off in this category. Offer a panchang-derived
hint instead of a hard block.

- **Start at:** `app/api/astrology/resolve-birth/route.ts`,
  `components/astrology/BirthForm.tsx`.
- **Depends on:** nothing.
- **Effort:** M human → S with CC.

### D5 — Merged-persona Hindi copy (P1 once Phase 1 lands)

Full HI parity for the unified two-voice reply. Both source personas have Hindi
today (`lib/groq.ts`, `lib/astrology/predictions.ts` `langBlock`); the merged
voice pair needs its own.

- **Start at:** the merged prompt builder, and the new per-domain i18n namespaces
  created by E4.
- **Depends on:** Phase 1 merge and the E4 dictionary split.
- **Effort:** S human → S with CC.

---

## Known debt (recorded, not scheduled)

- **`components/astrology/ChartHub.tsx` is a god-component.** `+770` lines in
  `e8e68b1`, then `+1279` in `6342a2d` — rewritten twice in three commits. Two
  rewrites in three commits means the module hasn't found its boundaries. Out of
  scope for the integration; worth a decomposition pass of its own.
- **`gita-app-build-plan.md` and `mindkshetra_barebones_app_dacb21c9.plan.md` are
  superseded** by `docs/designs/gita-jyotish-integration.md`. Candidates for
  deletion once nothing references them.
- **No test runner for the Gita half.** E1 adds one for the astrology engine.
  `lib/retrieve.ts`, `lib/cite.ts`, and `lib/stories.ts` remain covered only by
  the offline eval scripts.
