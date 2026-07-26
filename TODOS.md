# TODOS

Deferred work with enough context to pick up cold. Created 2026-07-26 from
`/plan-ceo-review` (see [docs/designs/gita-jyotish-integration.md](docs/designs/gita-jyotish-integration.md)).

---

## Execution order

Aggregated from all three reviews (44 emitted tasks → **42 actionable**). Task ids are
`ceo/T*`, `eng/E*`, `des/D*` and live in `~/.gstack/projects/LogitsLab-MindKshetra/tasks-*.jsonl`.

### Superseded — do NOT build these

| Dropped | Superseded by | Why |
|---|---|---|
| `ceo/T8` show per-citation "matched because X" | `des/D4` one reply-level context line | The causal claim is **false in the common case**: chart tags contribute ≤0.57 to a retrieval score whose vector arm reaches ~7.0, so the verse was matched by the user's words. A confident false claim is worse than no claim. |
| `ceo/T10` astrology engine test suite | `eng/E8` engine + bridge + parser suite | E8 widens coverage to the new code (where the risk is) and fixes the ordering: fixtures must exist **before** the route merge, not after. |
| `ceo/T6` as one task | `ceo/T6a/b/c` + `eng/E2` | Never mix structural and behavioural change. E2 also replaced the mechanism: two parallel Groq calls, not one tag-delimited reply. |

### Dependencies the task list doesn't encode

- `eng/E1` (field rename) **before** `ceo/T3` — a server-minted-id validator can't work while two issuers share one field name.
- `eng/E7` **corrects** `ceo/T2` — a build-time `.se1` check passes trivially and proves nothing about the deployed Lambda.
- `ceo/T5` **before** `eng/E3` — capture the baseline before adding assertions to it.
- `des/D1` **before** `des/D2` — the epigraph's height budget depends on the prompt cap.
- `des/D7` is the UI half of `eng/E6`'s verification logic.

### Waves

```
WAVE 0  ✅ SHIPPED 2026-07-26 (0051e65, 963cbb1)
  eng/E1(rename only) → ceo/T3 → ceo/T1 → ceo/T2+eng/E7 → eng/E5 → eng/E12

WAVE 1  measure before building                      CC ~40 min
  ceo/T5 → eng/E3 → eng/E4 spike        ◀── DECISION POINT

WAVE 2  foundations                                  CC ~4 hrs
  ceo/T4 · eng/E8 · des/D9 · des/D10

WAVE 3  the integration                              CC ~6 hrs
  des/D1 → eng/E2 → ceo/T6a(+eng/E11) → ceo/T6b → ceo/T6c
  des/D2 D3 D5 D6 D7 · eng/E6 · ceo/T7(+eng/E9) · eng/E10 · ceo/T9

WAVE 4  polish + Phase 2                             P2/P3
  des/D8 D11 D12 D13 D14 D15 D16 D17 · eng/E13 E14 · ceo/T11 T12 · eng/E15
```

**Wave 1 ends at a decision point.** `eng/E4` measures whether chart tags actually move
retrieval. If they don't, Waves 2-3 change shape — which is exactly why the spike sits
before the plumbing.

Note: `eng/E1` bundles a field rename with gating a dynamic import on the *merged* route.
Only the rename belongs in Wave 0; the gating half has nothing to gate until Wave 3.

### Carried out of Wave 0 into Wave 3

- **`eng/E1` dynamic-import half.** Gate `lib/astrology/engine` **and** `lib/astrology/dasha`
  behind `memberId || chartSessionId || birth` on the merged route. Both modules must be
  dynamic: `dasha.ts:7` → `transits.ts:6` → `swe` reaches the native `sweph` addon without
  ever calling `computeChart`, so gating the engine alone achieves nothing.

### Found while shipping Wave 0 (new, not from the reviews)

- **`eng/E13` is confirmed necessary, with a concrete example.** With `ephemeris/` hidden,
  the sun longitude for the golden fixture date came out **identical** to the Swiss value
  (60.183). So `scripts/qa-astrology-golden.cjs`'s `swiss || moshier` assertion passes in
  either mode *and* the sun check agrees numerically — the fixture proves nothing about
  which engine ran. Fixtures must record the mode, and the assertion should pin it.
  The moon and outer planets will not agree like that; use one of those as the canary.
- **`/api/astrology/health` correction.** The CEO review said health "cannot distinguish"
  the two modes. Imprecise: `healthSunLongitude()` already returned `ephemeris` as a bare
  mode string. The real defect was that it hardcodes `ok: true`, so a downgrade returned a
  200 no monitor could fail on. Fixed by deriving `ok` from the mode and returning 503.

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
