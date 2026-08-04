# MindKshetra — Complete Stitch Design System (Web + App)

**Purpose:** Single paste-ready system for Google Stitch covering **mobile (390×844)** and **web (1440×900)**.  
**Product:** MindKshetra — Your Spiritual Companion  
**Tagline:** Clarity from the Gita, for the battlefield of the mind.  
**Thesis:** chart pressure → Gita guidance → daily practice → shared sangha  

Live IA (do not invent a 5th primary tab): **Home · Explore · Mood · Astrology** + **Madhav FAB**.  
Journal / Meditation / Progress / Profile live under Practice & Account.

---

## R&D — modern gamification for spiritual apps (2025–26)

Synthesized from Headspace, Calm, MindTime, Insight Timer patterns + your mockup decks:

| Do (MindKshetra) | Don't |
|------------------|--------|
| **Practice first, game second** — Home is verse/path atmosphere; stats live on Account → Progress | Stats strip / fire streak on Home hero |
| **Private Seeker path** — rank + level + hexagonal/lotus badges on Profile only | Public leaderboards, XP shops, competitive ranks |
| **Grace-day streaks** — ring calendar, soft recovery copy | Guilt resets, “you broke your streak” red alerts |
| **Lifetime totals that never reset** — minutes, malas, verses | Points currency that can be lost |
| **Post-session celebration** — gold lotus, calm mood check (text), then Save | Confetti, emoji mood walls, arcade SFX |
| **Progressive unlocks** — meditation days 1–45, path days | Paywalled wisdom / locked charts |
| **Showcase boards** — sidebar story + 5 phones + value strip (your decks) | Scattered single screens without narrative |
| **Dark navy + metallic gold** — bedtime-safe, premium Vedic | Purple Calm clone, cream terracotta AI brochure |

**Visual DNA (locked):** void `#07090f` · field `#0e1420` · brass `#c9a227` / `#e2c45a` · teal `#3d7a6a` atmosphere only · Fraunces (Latin display) · Sora (UI) · Noto Serif Devanagari (Sanskrit/Hindi) · gold lotus mark · hairline brass borders · glass panels · cinematic photo atmosphere.

**Migration:** `021_personalization_achievements.sql` applied on project `xtadssxgwskyobxmhnxa` (achievements catalog live).


---

## Master style (paste first every Stitch session)

```
Design MindKshetra — Your Spiritual Companion. Premium spiritual-tech product (Gita × Jyotish × practice).

BRAND: gold lotus blossom + serif wordmark “MindKshetra”. Subtitle “Your Spiritual Companion”.
Tagline: “Clarity from the Gita, for the battlefield of the mind.”

COLOR: deep charcoal/midnight navy grounds (#07090f, #0e1420). Single accent metallic gold/brass (#c9a227, #e2c45a). Teal only as soft atmospheric glow. Text near-white primary, soft secondary, muted chrome. Thin gold borders on glass panels. Almost no drop shadows — hairline-built.

TYPE: elegant warm serif for brand & titles (Fraunces-like); geometric sans for UI (Sora-like); Devanagari serif for Sanskrit/Hindi — never uppercase Devanagari.

MOOD: serene, sacred, modern India — temple photography / mist / stars / zen sand as full-bleed atmosphere with dark scrims. Not temple kitsch, not purple wellness, not casino gamification.

GAMIFICATION (seeker-dignified):
- Seeker path ranks: Newcomer → Seeker → Practitioner → Steady → Established (private “Level N”)
- Hexagonal / lotus achievement marks with thin gold progress bars
- Circular streak rings + calendar with gold-circled days + grace days
- Progress charts in muted gold/teal — never neon, never public leaderboard
- Home has ZERO stats dashboard; tracking lives on Account/Progress

NAV APP: bottom tabs Home · Explore · Mood · Astrology (active = gold). Brass circular Madhav FAB bottom-right with guide glyph (not letter M).
NAV WEB: top nav Explore · Mood · Practice · Astrology · Ask Madhav (gold CTA) · Account.

COMPOSITION — SHOWCASE BOARD (when asked):
Left sidebar: lotus + module title + why-it-matters + 4–6 benefits + atmospheric illustration.
Center: 4–5 device frames numbered 01–05 in gold.
Bottom: value pillars or “what happens next” strip.
Same dark-gold system across the whole board.

FORBIDDEN: purple brand gradients, emoji chrome, floating promo badges on heroes, inset hero cards, paywall locks, Inter/Roboto as primary, uppercase Devanagari, letter-M Madhav avatar, fire-emoji streak spam on Home.
```

---

## Generation order

### A. App showcase boards (match your shared decks)
| File | Module |
|------|--------|
| `01-onboarding.md` | 5-step personalization |
| `26-meditation-board.md` | Discovery → sit → breath → complete → progress |
| `27-astrology-panchang-board.md` | Panchang · Muhurat · Horoscope · Transits · Calendar |
| `28-journal-board.md` | Reflection · Gratitude · Insights · Stats · Archive |
| `29-profile-progress-board.md` | Profile · Badges · Streak · Progress · Settings |
| `02-home.md` | Brand home + VOTD + path tiles |

### B. App single screens (core loop)
`03` Explore · `04` Chapter · `05` Sloka · `06–07` Mood · `08` Madhav · `09–12` Astrology cast/chart/milan · `13–15` Panchang/VOTD/Favorites · `16–21` Practice · `22–25` Community/Care/Support/Account · `30–33` Muhurat/Horoscope/Journal/Streak

### C. Web desktop (1440×900)
| File | Screen |
|------|--------|
| `34-web-home.md` | Marketing/home composition |
| `35-web-personalize-progress.md` | Account personalize + progress |
| `36-web-onboarding-welcome.md` | Soft welcome |
| `37-web-explore-sloka.md` | Explore + reading |
| `38-web-madhav-desktop.md` | Full-page Madhav two-voice |
| `39-web-astrology-suite.md` | Hub + muhurat + chart |
| `40-web-practice-journal.md` | Practice hub + journal |
| `41-web-achievements.md` | Seeker path desktop |

---

## How to use in Stitch
1. Paste **Master style** above.  
2. Generate boards A in order (mobile).  
3. Generate web C frames with “same design system, desktop 1440×900”.  
4. Keep tabs/FAB/nav identical across frames for handoff consistency.
