# MindKshetra

A Bhagavad Gita companion with a Vedic astrology engine. Next.js 14 App Router,
TypeScript, Tailwind, Supabase, Groq.

Design and scope decisions live in
[docs/designs/gita-jyotish-integration.md](docs/designs/gita-jyotish-integration.md).
Open work lives in [TODOS.md](TODOS.md).

---

## Prompt / LLM changes — the eval gate

**Touching any of these requires running the eval and diffing against the
recorded baseline:**

```
lib/retrieve.ts          lib/cite.ts            lib/bridge/*.ts
lib/groq.ts              lib/moods-data.ts      data/slokas.json
lib/astrology/predictions.ts (system prompts)
```

```bash
npm run eval                      # tag/JSON mode, always runs
npm run eval:hybrid               # vector mode, needs VOYAGE_API_KEY + >=200 embeddings
node scripts/spike-chart-tags.cjs # chart-tag A/B on the real production path
```

Compare against [docs/eval-baseline.md](docs/eval-baseline.md).

**The suite asserts set membership, not rank.** A verse sliding from position 2
to position 6 still reports PASS. That is why the baseline records the actual
top-5 per probe — diff the ordering, not just the pass/fail line.

**Voyage rate-limits at 429.** When it does, `retrieveSlokas` silently degrades
to tag-only and the run still looks completely normal. Any hybrid measurement
must be checked for `[embeddings] Voyage error 429` before its numbers are
trusted; a contaminated run is indistinguishable from a clean one otherwise.

## Ephemeris

`lib/astrology/swe.ts` prefers Swiss Ephemeris (`ephemeris/*.se1`) and falls
back to Moshier, which produces **different numbers**.

- The path is resolved at runtime via `process.cwd()`, which Next's output file
  tracing cannot see statically. `next.config.mjs` declares it explicitly via
  `outputFileTracingIncludes` — if that is removed, production silently runs
  Moshier while every local check passes.
- **Verify against production, never a build step:** `GET /api/astrology/health`
  must report `ephemeris.mode === "swiss"`. It returns 503 otherwise.
- `scripts/qa-astrology-golden.cjs` asserts `swiss || moshier`, so it passes in
  either mode. Worse, the sun longitude it checks is *identical* under both
  engines for the fixture date. Use the moon or an outer planet as the canary.

## Caching

`lib/astrology/memory-cache.ts` is **not** a working Redis substitute across
routes. Each route is its own module instance (its own Lambda in production), so
a chart written by `/api/astrology/compute` is invisible to
`/api/astrology/chat`. With Redis down the incognito flow 404s. See `eng/E16`.

## Field naming

`sessionId` means two unrelated things and must never be used unqualified:

- **`chatSessionId`** — a `chat_sessions` row id (`lib/chat-store.ts`)
- **`chartSessionId`** — an `astro:incog:` Redis key (`lib/astrology/incognito.ts`)

Chart session ids are **server-minted only** and validated as uuid v4. The id is
the cache key for a chart holding birth date, time and place, so accepting a
client-supplied id let two clients sharing `"1"` read one anonymous person's
birth details.

## Voice labels are UI chrome

`lib/groq.ts` instructs Madhav to **never** emit section labels or headings.
Multi-voice replies therefore render their labels in the component, not in the
prompt. This keeps prompts single-purpose and makes empty-voice states
structurally impossible: a voice with no content never renders a label.

## Testing

```bash
npm test              # vitest
npm run test:watch
npm run lint
npx tsc --noEmit
```

Tests live in `test/`. The astrology suite needs `ephemeris/*.se1` present and
the native `sweph` build available.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool.
When in doubt, invoke the skill.

- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
