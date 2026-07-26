# MindKshetra — design system

Documented, not invented (des/D16). All of this already existed in
`app/globals.css` and `tailwind.config.ts`; nobody had written it down, so every
review had to re-derive it and every new surface risked drifting from it.

Against the standard AI-slop checklist this system scores well: no purple
gradients, no three-column icon grid, no icons in coloured circles, no uniform
bubbly radius, no decorative blobs, no emoji, real typefaces, one accent colour,
and essentially **one `box-shadow` in the entire codebase**. It is hairline-built,
not shadow-built. Keep it that way.

---

## Type

| Role | Face | Loaded as |
|---|---|---|
| Display | **Fraunces** (warm serif) | `next/font/google` → `--font-display` |
| Body | **Sora** (geometric sans) | `next/font/google` → `--font-body` |

Two faces, no more. Never fall back to `system-ui` or `-apple-system` as a
primary — that is the "gave up on typography" signal.

**Devanagari never takes `uppercase` or `letter-spacing`.** It has no letter
case, and tracking pulls matras off their base consonants and breaks conjunct
ligatures. `app/globals.css` handles this globally via `html[lang="hi"]`, driven
by `LanguageProvider` setting `document.documentElement.lang`.

## Colour

One accent. Brass. That is the whole palette discipline.

```
--void        #07090f   page ground
--field       #0e1420   raised ground
--brass       #c9a227   THE accent — the only one
--brass-soft  #e2c45a   small text on dark
--teal-glow   #3d7a6a   atmosphere only, never a UI accent
--text        #eef2f7   primary reading
--text-soft   #c3ccd9   secondary READING copy      (des/D9)
--text-muted  #9aa8bc   chrome, labels, disclaimers
```

`--text-soft` exists because the gap between `--text` and `--text-muted` was too
wide: one dim token was serving 17px body copy, 15px translations, 11px
disclaimers *and* 60%-alpha placeholders, so any secondary content ended up
styled like fine print. **Reserve `--text-muted` for chrome. Use `--text-soft`
for prose someone is meant to actually read.**

A full light theme overrides every token under `[data-theme="light"]`.

## Elevation

```
.panel        blur 14px   general containers
.panel-strong blur 18px   modals, nav
.glass        blur 16px + saturate(1.1)   reading surfaces
.surface      NO BLUR     hover cards, list rows
```

**`.surface` has no `backdrop-filter`.** That is fine for a list row and wrong
for anything holding body text, because `.site-atmosphere` puts an animated
photograph behind everything. Reading surfaces use `.glass` — that is why the
chat reply moved to it (des/D3).

## Borders — the hierarchy

```
--line      rgba(201,162,39,.22)   CONTAINING surfaces
--hairline  rgba(255,255,255,.06)  INTERNAL division
```

`--line` used to do every border job, which is precisely why replies read as
card soup: citations bordered in `--line` became visual peers of the panel that
contained them. **A container gets `--line`. Anything dividing content inside it
gets `--hairline`, or nothing.**

## Motion

`.animate-rise` (+ 3 stagger delays), `.animate-fade`, `field-breathe`,
`.astro-zodiac-ring`, and a brass streaming pulse at `rgba(201,162,39,.12)`.

`prefers-reduced-motion` is a **wildcard**, not an allowlist (des/D10). It used
to enumerate class names, which meant every new animation shipped unguarded
until someone remembered to register it — a silent failure affecting exactly the
users who asked for less motion.

## Components

- `EmptyState` — ornament SVG + display title + muted body. Empty states are
  features. Never ship "No items found."
- `.eyebrow` — 11px uppercase, `0.16em` tracking. The label idiom.
- `ZodiacRing` (`app/astrology/page.tsx`) — the astrology mark. Reuse it; do not
  rebuild it from pseudo-elements.

## The two-voice reply

The product's most important surface.

```
  │ Saturn holds your tenth house until March 2028.   ← Fraunces 18-19px,
  │                                                     --text, upright,
  │                                                     brass rule, NO panel,
  │                                                     NO label, NO glyph
  ◉ MADHAV
  ┌────────────────────────────────────────────┐
  │ teaching, 17px, .glass                     │
  └────────────────────────────────────────────┘
    Read alongside your chart · career
    2.47  translation…            ← hairline list, not cards
```

Rules that are load-bearing:

1. **Voice labels are UI chrome, never model output.** `lib/groq.ts` forbids
   Madhav from emitting headings. Rendering labels in the component keeps prompts
   single-purpose *and* makes an empty labelled block impossible — a voice with
   no content renders no label.
2. **The chart line is not muted, italic or small.** The first draft used all
   three, which is this app's disclaimer register — it styled the product's
   differentiator as fine print.
3. **The epigraph slot is height-reserved.** Two calls finish at different times
   and the view auto-scrolls while streaming; without a reserved slot, text jumps
   under the reader.
4. **Provenance states context, never causation.** "Read alongside your chart",
   not "matched because X".
5. **One face per reply.** Madhav has a portrait. A chart is not a person.
6. **Crisis suppresses the chart entirely.** Helplines lead; no planetary
   language appears anywhere.
