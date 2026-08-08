# Translations & copy — volunteer guide

Hindi is not a translation afterthought here: every user-facing string is
authored EN+HI together. This page is the on-ramp for improving that copy
and for proposing new languages.

## Where strings live

- Web: `lib/i18n/namespaces/*.ts` — flat keys per domain (`gita`,
  `astrology`, `sadhana`, `account`, `chat`, `shared`, `support`). Each
  file exports `en` and a matching `hi` record; TypeScript enforces the
  key sets match.
- Mobile: `src/i18n/namespaces/` in the app repo, same convention.

Improve a string: edit both languages in the same PR (or just HI if EN is
fine), keep placeholders like `{score}` intact, and say in the PR why the
new register is better. The `translation` issue template works for
suggestions without a PR.

## Register rules (the voice)

- Invitational, never guilt: "Your practice rested yesterday. Continue
  today." — never "you missed", "you failed", streak-shaming, or urgency.
- Hindi is written naturally, not transliterated English; devotional
  register where the surface is devotional (साधना, श्लोक), plain where it
  is functional (settings, errors).
- Provenance stays soft: "कुंडली के साथ" (alongside your chart), never
  causal claims ("because your chart says").
- Crisis and safety copy is clinician-reviewed — do not reword
  `lib/crisis.ts` strings in a drive-by PR; open an issue instead.

## Typography constraints (enforced in CSS, respect them in copy)

- Devanagari is never uppercased or letter-spaced (`html[lang="hi"]` strips
  both). Don't design copy that depends on caps for emphasis.
- No emoji anywhere in product copy (DESIGN.md).

## Language steward slots (named ownership)

A locale ships only with a **named steward** — one person who owns
register and review for that language, reachable for follow-ups. The
technical path is the easy half; the steward is the hard half.

| Code | Language | Script notes | Steward slot |
|------|----------|--------------|--------------|
| `hi` | Hindi | Devanagari — already shipping EN+HI | In-repo maintainers |
| `ta` | Tamil | Tamil script — needs Noto Tamil (or equivalent) | **Open** — claim via issue |
| `te` | Telugu | Telugu script — needs Noto Telugu | **Open** — claim via issue |
| `bn` | Bengali | Bengali script — needs Noto Sans Bengali | **Open** — claim via issue |

To claim a slot: open an issue titled `Language steward: <language>`
describing your background with the language and the Gita. Until a steward
is named and accepting review, do not merge product UI for that locale
(partial drafts in a branch are fine).

Verse translations themselves (the scripture text) are a separate content
project with public-domain sourcing rules — ask before starting one.

## How to add a new i18n namespace

Namespaces keep domains small and reviewable. To add one (e.g. `circles`):

1. **Web** — create `lib/i18n/namespaces/<name>.ts` exporting `en` and
   `hi` with identical keys (`as const` + `Record<keyof typeof en, string>`).
2. **Wire web dictionary** — import and spread into the central dictionary
   (same pattern as `gita` / `account` in `lib/i18n`).
3. **Mobile** — mirror the file under
   `MindKshetra-app/src/i18n/namespaces/<name>.ts` and spread it in
   `src/i18n/dictionary.ts`.
4. **Keys only** — no nested objects; flat `camelCase` keys. Placeholders
   stay `{name}`-style in both languages.
5. **PR** — one namespace per PR when possible; include a short note on
   register (devotional vs functional) so stewards can review tone.

Widening `AppLang` beyond `en` | `hi` (Partial\<Record\> fallback to EN,
per-script fonts) is tracked separately; do not land a new locale code
without a named steward from the table above.
