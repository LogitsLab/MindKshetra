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

## Proposing a new language (Tamil, Telugu, Bengali…)

A locale ships only with a **named steward** — one person who owns
register and review for that language, reachable for follow-ups. The
technical path (widening the `AppLang` union, `Partial<Record>` fallback
to EN, per-script Noto fonts) is tracked in TODOS.md and is the easy half;
the steward is the hard half. Open an issue titled
`Language steward: <language>` describing your background with the
language and the Gita.

Verse translations themselves (the scripture text) are a separate content
project with public-domain sourcing rules — ask before starting one.
