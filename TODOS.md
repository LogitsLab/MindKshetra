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
| `ceo/T8` show per-citation "matched because X" | `des/D4` one reply-level context line | **Rationale partly retracted.** It was cut because the causal claim was believed false (≤0.57 vs ~7.0). The `eng/E4` spike measured the real path and that arithmetic was wrong — see the decision-9 note below. D4 still stands on design grounds (it repeated the epigraph verbatim, failed AA at 11px/70% alpha, added a fourth rule per card), but the truth objection is gone. |
| `ceo/T10` astrology engine test suite | `eng/E8` engine + bridge + parser suite | E8 widens coverage to the new code (where the risk is) and fixes the ordering: fixtures must exist **before** the route merge, not after. |
| `ceo/T6` as one task | `ceo/T6a/b/c` + `eng/E2` | Never mix structural and behavioural change. E2 also replaced the mechanism: two parallel Groq calls, not one tag-delimited reply. |

### Dependencies the task list doesn't encode

- `eng/E1` (field rename) **before** `ceo/T3` — a server-minted-id validator can't work while two issuers share one field name.
- `eng/E7` **corrects** `ceo/T2` — a build-time `.se1` check passes trivially and proves nothing about the deployed Lambda.
- `ceo/T5` **before** `eng/E3` — capture the baseline before adding assertions to it.
- `des/D1` **before** `des/D2` — the epigraph's height budget depends on the prompt cap.
- `des/D7` is the UI half of `eng/E6`'s verification logic.

### Waves — status 2026-07-26

```
WAVE 0  ✅ SHIPPED  (0051e65, 963cbb1)
  eng/E1(rename) ceo/T3 ceo/T1 ceo/T2+eng/E7 eng/E5 eng/E12

WAVE 1  ✅ SHIPPED  (789d9f6)
  ceo/T5 eng/E3 eng/E4        ◀── spike result OVERTURNED decision 9, see below

WAVE 2  ✅ SHIPPED  (0959a8d)
  ceo/T4 eng/E8 des/D9 des/D10 + CLAUDE.md
  bonus: fixed lib/cite.ts Devanagari dead code, found by the new tests

WAVE 3  🟡 PARTIAL  (ca1c2ba, f40eae4)
  ✅ eng/E16 des/D1 eng/E6 eng/E2 ceo/T6b ceo/T6c
     des/D2 des/D3 des/D4 des/D5 des/5A
  ❌ ceo/T6a  delete the astrology chat route (deliberately deferred — the
              two-voice path was built ADDITIVELY so it could be verified
              against the old route before anything was removed)
  ❌ ceo/T7 + eng/E9   forwarding shim (only needed once T6a happens)
  ❌ eng/E10  two-voice persistence — needs a chat_messages migration
  ❌ eng/E11  enumerate T6a behaviour deltas
  ❌ ceo/T9   remedies paired with verses
  ❌ des/D6   crisis UI treatment (the SERVER suppression shipped in Wave 0;
              the visual treatment did not)
  ❌ des/D7   epigraph suppression on decline (verifier drops sentences, but the
              decline path is not wired)
  ❌ des/D8   no-chart-linked invitation
  ❌ AstroChat fold into ChatWindow

WAVE 4  🟡 PARTIAL  (3c13c49)
  ✅ eng/E13 des/D13 des/D14
  🟡 des/D15  grid fixed; the ASSET half cannot be done in code
  ❌ eng/E14 des/D11 des/D12 des/D16 des/D17 ceo/T11 ceo/T12
  ⛔ eng/E15  Razorpay merchant onboarding — external, needs entity
              registration, business KYC and RBI e-mandate approval
```

**Roughly 26 of 41 actionable tasks are shipped.** (`ceo/T8` and `ceo/T10` are
dead — superseded, see above.)

### ⚠ The eng/E4 spike overturned decision 9 — this needs a call

The eng review concluded chart tags contribute `<=0.57` against a vector arm
reaching `~7.0` and were therefore near-inert. **Measured on the real production
path, that is wrong.** Overlap with the chart-off top-5 was 1/5, 3/5 and 1/5 and
the primary verse changed in every clean probe. See `docs/eval-baseline.md`.

The original arithmetic used a single tag's contribution instead of the sum
across matching tags, used the vector arm's theoretical maximum instead of real
similarities, and missed that the `* 0.3` tag weight is uniform and so does not
reorder within the tag arm at all.

Two decisions rested on that wrong number:

- **decision 9A** (reading voice is the differentiator, bridge is supporting).
  Now looks like BOTH differentiate. Additive, not contradictory — no action
  strictly required.
- **des/D4 / ceo/T8** (per-citation "matched because X" was cut because the
  causal claim was thought false). The claim now appears TRUE. D4 still stands
  on its independent design grounds — it repeated the epigraph verbatim, failed
  AA at 11px/70% alpha, and added a fourth internal rule per card — but if you
  want per-verse provenance back, the truth objection is gone.

**Different is not better.** The spike measures movement, not quality. Nobody has
yet read chart-on outputs and judged whether they land better.

Note: `eng/E1` bundles a field rename with gating a dynamic import on the *merged* route.
Only the rename belongs in Wave 0; the gating half has nothing to gate until Wave 3.

### Carried out of Wave 0 into Wave 3

- **`eng/E1` dynamic-import half.** Gate `lib/astrology/engine` **and** `lib/astrology/dasha`
  behind `memberId || chartSessionId || birth` on the merged route. Both modules must be
  dynamic: `dasha.ts:7` → `transits.ts:6` → `swe` reaches the native `sweph` addon without
  ever calling `computeChart`, so gating the engine alone achieves nothing.

### Found while shipping Wave 0 (new, not from the reviews)

- **`eng/E16` (NEW, P1): the in-memory cache is not a working fallback for incognito
  charts.** All three reviews treated `lib/astrology/memory-cache.ts` as a degraded-but-
  functional Redis substitute. It isn't. `/api/astrology/compute` writes the chart and
  `/api/astrology/chat` reads it, and those are separate module instances — so with Redis
  unreachable the write lands somewhere the reader cannot see and incognito chat returns
  `404 Chart not found`, always. In production each route is a separate Lambda, so this is
  worse there, not better.

  Verified by controlled comparison against the pre-change code (worktree at `cd83f74`,
  Redis reporting `configured: false`): mint → resume 200 → hit the chat route → 404 →
  resume 404. Identical on both code versions, so **pre-existing, not a Wave 0
  regression**. The bounded-LRU fix (`eng/E5`) is still correct and still needed; it
  addresses the memory leak, not this.

  Fix options: (a) require Redis for the incognito path and fail loudly with a clear
  message instead of a bare 404, (b) have the chat route recompute from `body.birth` when
  the cache misses — the branch already exists and is what makes the flow work today, so
  make it the documented path rather than an accident, or (c) persist incognito charts in
  Supabase with a TTL. **(a)+(b) together is the honest minimum.**
  Depends on: nothing. Should land before Wave 3 merges the routes.

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
