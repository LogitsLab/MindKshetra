# Retrieval eval baseline

Captured 2026-07-26T17:03:38Z at commit `fa7c132`,
BEFORE any chart-derived tags were injected into `lib/retrieve.ts` (ceo/T5).

Regenerate: `npm run eval`. Any change to `lib/retrieve.ts`,
`lib/cite.ts`, `lib/moods-data.ts` or `data/slokas.json` must be compared
against this file. A verse dropping out of a top-5 is a regression even when
the suite still reports PASS, because the assertions check membership, not rank.

## Retrieval top-5 per probe

```
PASS "I am terrified about tomorrow" → 11.23, 1.3, 1.5, 1.6, 1.7 (tag) 
PASS "I lost someone I love and cannot stop crying" → 1.15, 1.25, 1.28, 1.41, 1.43 (tag) 
PASS "I keep exploding with rage at my family" → 2.62, 4.11, 1.41, 5.3, 9.29 (tag) (ref)
PASS "I don't know which job to choose" → 18.10, 2.7, 18.73, 1.32, 1.34 (tag) 
PASS "I feel burned out and overwhelmed at work" → 3.25, 3.18, 3.27, 6.1, 18.8 (tag) 
PASS "I feel completely alone" → 1.11, 6.39, 7.14, 1.4, 1.35 (tag) 
PASS "I feel guilty about a mistake I made" → 3.37, 11.41, 11.42, 16.19, 2.38 (tag) (ref)
PASS "Everyone else seems more successful than me" → 16.18, 16.13, 1.32, 7.3, 17.18 (tag) 
PASS "I feel worthless and like a failure" → 2.48, 2.49, 2.55, 3.16, 4.22 (tag) 
PASS "I can't stop craving things I don't need" → 18.2, 18.24, 18.53, 1.32, 1.33 (tag) 
PASS "How do I let go of attachment?" → 6.24, 16.21, 1.33, 2.71, 5.3 (tag) (ref)
PASS "I need courage to stand up for what is right" → 2.62, 2.3, 2.37, 4.42, 11.24 (tag) (ref)
PASS "My mind will not stay still during meditation" → 6.10, 6.13, 6.16, 6.21, 13.25 (tag) 
PASS "I am obsessed with career success" → 1.32, 7.3, 16.13, 18.24, 2.4 (tag) 
PASS "My partner and I keep fighting" → 1.28, 2.31, 2.33, 13.12, 1.1 (tag) 
PASS "I want to feel grateful again" → 1.33, 1.32, 2.5, 2.70, 3.12 (tag) 
PASS "I want to surrender and have faith" → 7.2, 7.21, 7.22, 4.39, 9.22 (tag) (ref)
PASS "I worry too much about results" → 18.30, 2.43, 2.40, 1.34, 1.35 (tag) 
PASS "Everything feels temporary and I fear death" → 1.25, 3.35, 1.3, 1.5, 1.6 (tag) 
PASS "I keep falling back into bad habits" → 6.3, 6.5, 6.10, 6.12, 6.13 (tag) (ref)
PASS "My ego keeps getting in the way" → 18.26, 12.13, 15.5, 16.9, 3.27 (tag) (ref)
PASS "I have lost hope that things will get better" → 1.30, 1.1, 18.12, 4.31, 9.3 (tag) 
PASS "I have no motivation to do anything" → 14.5, 14.8, 14.9, 14.10, 14.13 (tag) 
PASS "What is my purpose in life?" → 2.69, 2.72, 4.7, 4.19, 4.24 (tag) 
PASS "I feel ashamed and want to hide" → 3.37, 5.9, 7.27, 8.11, 1.39 (tag) 
```

## Non-retrieval checks

```
PASS "fear" top: 1.3, 1.5, 1.6, 1.7, 1.10
PASS "anger" top: 2.56, 2.62, 2.63, 3.21, 3.37
PASS "duty" top: 2.7, 2.31, 2.33, 3.1, 3.2
PASS "grief" top: 1.1, 1.2, 1.3, 1.4, 1.5
PASS "peace" top: 1.21, 1.22, 1.23, 2.8, 2.45
PASS "jealousy" top: 1.38, 1.39, 2.57, 2.59, 2.64
PASS "lonely" top: 18.16, 1.4, 1.11, 1.35, 2.59
PASS ref 2.47 [ '2.47' ]
PASS ref 18.66 [ '18.66' ]
PASS "शांति" top: 1.41, 2.8, 2.64, 3.16, 3.20
PASS dot refs in range 2.47, 18.66
PASS clock time ignored (none)
PASS colon with context accepted 2.47
PASS out of range chapter (none)
PASS verse beyond chapter max (none)
PASS tag loneliness count=116
PASS tag jealousy_comparison count=69
PASS tag hope count=141
PASS tag overwhelm_burnout count=73
PASS tag low_self_worth count=62
```

## Hybrid (vector) mode

SKIPPED at baseline — needs `VOYAGE_API_KEY` + >=200 embeddings in Supabase.
Run `npm run eval:hybrid` and append its output here before trusting any
conclusion about production retrieval: the vector arm scores at `* 0.7 * 10`
while tags score at `* 0.3`, so tag-only results understate how dominant
the user's own words are in production.

---

## Chart-tag A/B result (eng/E3 + eng/E4 spike)

Measured 2026-07-26 against the REAL `lib/retrieve.ts` on the production path
(`CONTENT_SOURCE=db`, Voyage, 701 embeddings) via `node scripts/spike-chart-tags.cjs`.

| probe | area | overlap with chart-off top-5 | primary verse |
|---|---|---|---|
| "things have been hard lately" | marriage | 1/5 | CHANGED |
| "I am worried about the future" | finance | 3/5 | CHANGED |
| "everything feels heavy" | health | 1/5 | CHANGED |

A fourth probe (career) was discarded: Voyage returned 429 on its first call, so
it silently degraded to tag-only and would have compared hybrid-vs-tag-only
rather than chart-off-vs-chart-on. **Always check for 429 before trusting a run**
— a contaminated result looks completely normal.

Tag-only mode (no embeddings) is even more chart-dominant: 6/6 probes moved,
avg overlap 0.7/5.

### This overturns the "the bridge is near-inert" premise

The engineering review reasoned that chart tags contribute `<=0.57` against a
vector arm reaching `~7.0` and concluded chart-driven selection was close to a
no-op. That arithmetic was wrong three ways:

1. It used a SINGLE tag's contribution. A verse matching 3 chart tags gets ~3x.
2. It used the vector arm's THEORETICAL max (cosine 1.0). Real similarities are
   lower, and a verse surfaced only by tags gets ZERO vector score — so a
   strongly tag-matched verse can outrank a weakly-vector-matched one.
3. The `* 0.3` is applied uniformly across the whole tag arm, so it does not
   reorder anything WITHIN that arm.

**Measured, the chart substantially changes which verses a user sees.**

### What this does NOT establish

Different is not better. This harness measures movement, not quality. Whether
chart-selected verses land better for a real person is unmeasured, and the
existing eval cannot answer it — its assertions check membership in an expected
set, and the chart-on results leave those sets entirely.

Before treating chart-driven selection as a feature rather than a behaviour,
someone has to read chart-on outputs and judge them.
