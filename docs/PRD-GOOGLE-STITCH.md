# MindKshetra — Complete Product Requirements Document (PRD)
### Design brief for Google Stitch / UI generation

**Version:** 1.1 — **App-focused** (mobile-first for Stitch)  
**Product:** MindKshetra  
**Publisher:** LogitsLab  
**Live:** https://mind.logitslab.com  
**Stitch focus:** **Mobile app (Expo iOS/Android) · 390×844** — web is secondary parity  
**Quick start:** [`APP-FOCUS-STITCH.md`](./APP-FOCUS-STITCH.md) · per-screen prompts: [`stitch-prompts/`](./stitch-prompts/)  
**Tagline:** *Clarity from the Gita, for the battlefield of the mind.*  
**Store subtitle:** Gita companion for the mind  
**Short description:** Clarity from the Gita — verses, Madhav chat, and Jyotish charts.

---

## 1. Product vision

### 1.1 What it is
MindKshetra is a calm, citation-grounded companion that meets mental pressure with the Bhagavad Gita (701 verses) and real Vedic/Jyotish birth charts — then turns insight into daily practice and gentle community (sangha).

It is **not** a meditation marketplace, a Calm clone, a paid astrologer network, or therapy. It is a free-forever nonprofit product funded by dāna (voluntary support).

### 1.2 Locked product thesis
```
chart pressure → Gita guidance → daily practice → shared sangha
```

### 1.3 Primary jobs to be done
1. **Meet a mood with scripture** — “I feel anxious; show me verses that speak to this.”
2. **Ask Madhav** — warm AI guide grounded in retrieved Gita teachings (and optionally chart context).
3. **Cast / read a Jyotish chart** — deterministic ephemeris; LLM only narrates facts.
4. **Practice daily** — sādhana, japa, progressive meditation, themed 7-day paths.
5. **Live lightly with time** — panchang, Verse of the Day, observances calendar.

### 1.4 Positioning statement
For people carrying mental pressure who want wisdom without hype, MindKshetra is a Gita × Jyotish companion that pairs how you feel with cited verses, real birth charts, and quiet daily practice — free forever, never paywalled.

### 1.5 Explicit non-goals
- Paywalled features or gated astrology tools
- Aggressive social feed / likes / follows
- Medical, financial, or legal advice
- Invented planetary placements (ephemeris is source of truth)
- Purple-gradient AI-slop UI, emoji chrome, dashboard stat strips on home

---

## 2. Users & roles

| Type | Access | Notes |
|------|--------|-------|
| **Guest (signed out)** | Browse verses, moods, panchang; local progress; anonymous Madhav session | Full read experience without account |
| **Anonymous Supabase user** | Same + push tokens; merges on upgrade | Soft identity |
| **Signed-in user** | Favorites, journal, streaks, chart members, paths/meditation sync, public profile | Google OAuth or email magic link / OTP |
| **Sustainer** | Cosmetic badge only | Never gates features |
| **Maintainer** | `/admin/moderation` | Env allowlist |

**Languages:** English + Hindi (UI + content).  
**Themes:** Dark (default) + Light.

---

## 3. Design system (Stitch must follow)

### 3.1 Visual DNA
Atmosphere-first, hairline-built, one accent. Dark photographic field with teal/brass washes. Brand must dominate the first viewport — not a small nav logo.

**Brand mark:** Lotus leaf SVG  
**AI persona:** Madhav — portrait + glyph FAB (never a letter “M” alone)  
**Wordmark:** MindKshetra in display type

### 3.2 Color tokens (dark default)

| Token | Hex | Role |
|-------|-----|------|
| `void` | `#07090f` | Page ground |
| `field` | `#0e1420` | Raised ground |
| `brass` | `#c9a227` | **Only** UI accent |
| `brass-soft` | `#e2c45a` | Small text on dark / active states |
| `teal-glow` | `#3d7a6a` | Atmosphere only — never buttons/links |
| `text` | `#eef2f7` | Primary reading |
| `text-soft` | `#c3ccd9` | Secondary prose (meant to be read) |
| `text-muted` | `#9aa8bc` | Chrome, labels, disclaimers only |
| `line` | `rgba(201,162,39,.22)` | Containing surface borders |
| `hairline` | `rgba(255,255,255,.06)` | Internal dividers |
| `onMedia` / `onMediaMuted` | near-white / soft white | Copy over photographs |

Light theme inverts grounds to warm off-white fields with dark text; brass remains the accent.

### 3.3 Typography

| Role | Face | Use |
|------|------|-----|
| Display / Latin headlines | **Fraunces** (warm serif) | Brand, heroes, chart epigraph |
| Body / chrome | **Sora** (geometric sans) | UI, body, buttons |
| Devanagari / Sanskrit | **Noto Serif Devanagari** | Sanskrit verses, Hindi |

**Rules:**
- Never use Inter, Roboto, Arial, or system-ui as primary.
- Never apply `uppercase` or letter-spacing to Devanagari.
- Fraunces must not be applied to Devanagari text (no glyph coverage).

**Type scale (mobile reference):**

| Step | Size / line |
|------|-------------|
| poster | 52 / 58 |
| display | 32 / 38 |
| title | 22 / 28 |
| subtitle | 18 / 24 |
| sanskrit | 24 / 36 |
| body | 16 / 24 |
| soft | 15 / 22 |
| muted | 13 / 18 (floor — nothing smaller) |
| eyebrow | 11 / 14 · uppercase · 0.16em tracking · Latin only |

### 3.4 Surfaces & elevation

| Primitive | Use |
|-----------|-----|
| **Panel** | Contained blocks with `--line` border + soft blur |
| **Glass** | Reading / chat replies (blur + slight saturate) |
| **Surface** | List rows — hairline only, no blur |
| **Path tile** | Full-bleed photo + dark media scrim + title |
| **Atmosphere** | Fixed photo backdrop + teal/brass radial washes + void veil |

**Elevation philosophy:** Hairline borders over shadows. Essentially one box-shadow in the whole product. No card soup.

### 3.5 Motion (intentional, not noisy)
1. **Rise** — screen enter: fade + ~18px Y translate
2. **FAB pulse** — brass streaming pulse while Madhav is generating
3. **Field breathe** — subtle atmosphere ring (respect reduce-motion)
4. Favorite / complete haptics (mobile)
5. Tab active → brass-soft

Kill **all** motion when `prefers-reduced-motion` / reduce-motion is on.

### 3.6 Hard anti-patterns (do not generate)
- Purple / indigo gradients
- Cream + terracotta “AI brochure” look
- Broadsheet newspaper columns
- Flat single-color backgrounds with no atmosphere
- Inset / rounded hero image cards on landing
- Floating badges, promo stickers, pill clusters on heroes
- Dashboard stat strips on Home
- Emoji as chrome
- Icons in colored circles
- Multi-layer drop shadows
- Rounded-full pill button clusters
- Cards in the hero

### 3.7 Composition rules (especially Home / onboarding)
- First viewport = **one composition**: brand + one headline + one short line + one CTA group + one dominant edge-to-edge image/atmosphere
- Brand is hero-level, not nav text
- One job per section
- Empty states are designed features (ornament + display title + soft body) — never “No items found”

---

## 4. Information architecture

### 4.1 Mobile navigation
**Bottom tabs:** Home · Explore · Mood · Astrology  
**Floating action:** Brass Madhav FAB (bottom-right) → full-screen chat modal  
**Stacks:** Sloka, VOTD, Favorites, Sādhana, Japa, Meditation, Paths, Panchang, Account, Community, Privacy, Milan, Chart members

### 4.2 Web navigation
**Primary:** Explore · Mood · Practice (Sādhana) · Astrology  
**CTA:** Ask Madhav  
**More:** Panchang · Community · Support  
**Account** via auth button  
**Footer:** Community, Support, Privacy, Account + optional WhatsApp/Telegram

### 4.3 Core user flows (summary)

```
Onboarding → Home
Home → VOTD / Mood / Practice tiles / Astrology / Madhav FAB
Mood → Mood detail → Sloka list → Sloka detail
Explore → Chapter → Sloka detail (favorite / journal / complete / share)
Madhav → Chat (crisis? → Care) else verses or chart-aware two-voice reply
Astrology → Incognito chart OR Members → Chart detail → Pressure→Practice → Madhav
Sādhana → Verse + sit + reflection (+ japa)
Meditation → Day player (TTS + silence)
Paths → 7-day journey days
Panchang → Day elements / Month calendar
Account → Auth, prefs, streak, reflections, export/delete
Care → Crisis helplines (India-focused)
Support → Dāna / transparency
```

---

## 5. Screen-by-screen specifications

Use these as Google Stitch prompts / frames. Design **mobile-first** (390×844) and **desktop** (1440×900) for web parity screens.

---

### S01 — Onboarding (mobile, 4 screens, one photo backdrop)

**Purpose:** First-run welcome; language; account choice.  
**Atmosphere:** Single edge-to-edge photograph for all 4 steps (`hero.jpg` style — dark sky/ground, bright horizon ~62% down). No inset images. Copy uses `onMedia` colors.

| Step | Content |
|------|---------|
| 1 | Brand mark + “MindKshetra” + tagline + short welcome |
| 2 | Paths preview — “Meet pressure with practice” |
| 3 | Language: English / हिंदी |
| 4 | Account: Continue as guest · Continue with Google · Email OTP |

**UI chrome:** Progress dots (exactly 4). Back on every step. Primary brass CTA. Secondary ghost/outline for guest.  
**Do not:** Different photo per step; cards floating on horizon band; finish onboarding if auth cancelled.

---

### S02 — Home

**Purpose:** Calm hub. Brand-first.  
**Layout:**
1. Brand mark + wordmark (hero-level)
2. Short hero line (tagline or daily invitation)
3. Verse of the Day — glass panel (ref + short English/Hindi excerpt + “Read”)
4. Path tiles (image + scrim): Mood · Ask Madhav · Practice · Astrology
5. Optional lower: Sangha / Care / Support links (not in first viewport)

**Mobile:** Scroll under custom tab bar; reserve bottom inset for FAB.  
**Web:** Same DNA + fuller practice/lifestyle section below fold.  
**Do not:** Stats strip, streak counters as hero, multi-card dashboard.

---

### S03 — Explore (chapter grid)

**Purpose:** Browse 18 chapters of the Gita.  
**Layout:**
- Header: “Explore” + search field (EN / HI / chapter-verse refs)
- 2-column grid of chapter tiles
- Each tile: brass number ring (1–18), chapter title (EN + optional HI), verse count

**Empty / no results:** Designed empty state, not raw “No items.”

---

### S04 — Chapter detail

**Purpose:** List verses in a chapter.  
**Layout:** Chapter title hero (eyebrow “Chapter N”) · soft intro · verse list as **surface rows** (ref · first line of English · chevron). Hairline dividers. No card stack.

---

### S05 — Sloka / Verse detail (core reading surface)

**Purpose:** Immersive reading of one verse.  
**Layout (top → bottom):**
1. Eyebrow: `Chapter X · Verse Y` / `BG X.Y`
2. Sanskrit (Noto Serif Devanagari, large)
3. Brass hairline divider
4. IAST transliteration (muted chrome)
5. Hindi translation (`text-soft`)
6. English translation (`text`)
7. Optional AI “verse story” / contemporary reflection (glass)
8. Toolbar icons (not pills): Favorite · Complete · Share · Journal
9. Journal box (signed-in): private reflection textarea

**States:** Favorited (brass fill), Completed (checkmark), Story loading / “Another reflection” (max 3 variants).

---

### S06 — Mood grid

**Purpose:** Match how you feel to verses.  
**Content — 18 moods:**

| ID | EN | HI |
|----|----|----|
| anxious | Anxious | चिंतित |
| sad | Sad | उदास |
| angry | Angry | क्रोधित |
| confused | Confused | उलझन में |
| grieving | Grieving | शोक में |
| lonely | Lonely | अकेला |
| overwhelmed | Overwhelmed | अभिभूत |
| guilty | Guilty | दोषी |
| jealous | Jealous | ईर्ष्यालु |
| unmotivated | Unmotivated | निष्क्रिय |
| fearful | Fearful | भयभीत |
| hopeful | Hopeful | आशावान |
| grateful | Grateful | कृतज्ञ |
| big-decision | Facing a big decision | बड़े निर्णय पर |
| conflict | Going through conflict | संघर्ष में |
| failure | Feeling like a failure | असफलता का भाव |
| purpose | Searching for purpose | उद्देश्य खोजते |
| happy | Happy | प्रसन्न |

**Layout:** Accent-tinted tiles (subtle mood tint over field, brass border on press). Header: “How are you feeling?” Eyebrow optional. Optional chart-aware reordering note (soft, not a badge cluster).

---

### S07 — Mood detail

**Purpose:** Verses tagged for that mood.  
**Layout:** Mood title · short empathic line · list of SlokaCards (ref + English excerpt). Tap → S05.

---

### S08 — Ask Madhav (chat)

**Purpose:** Citation-grounded guide. Most important interactive surface.  
**Chrome:**
- Header: Madhav portrait + name + soft subtitle (“Gita guide” / chart mode label)
- Message list
- Composer: multiline input + send (brass)
- Streaming: FAB/header pulse

**Message types:**
1. **User bubble** — simple, soft surface
2. **Madhav teaching** — `.glass` panel, 17px, Madhav label with portrait glyph
3. **Two-voice chart reply** (critical):
   - **Chart epigraph** (no panel): Fraunces 18–19px, `--text`, upright, brass rule above, **no label, no glyph** — e.g. “Saturn holds your tenth house until March 2028.”
   - **Madhav teaching** below in glass
   - Citation list under hairline: “Read alongside your chart · career” + verse refs + short translation (not cards)
4. **Crisis mode:** Helplines only; **no** planetary language; route emphasis to Care

**Rules for Stitch:**
- Voice labels are UI chrome, never part of model text styling as headings
- Chart line is never muted/italic/small
- One face per reply (Madhav portrait only — chart is not a person)
- Disclaimer: Madhav is not a therapist

---

### S09 — Astrology hub

**Purpose:** Entry to Jyotish tools.  
**Layout:**
- Image hero (edge-to-edge atmosphere) + ZodiacRing mark
- Headline: Astrology / ज्योतिष
- Supporting line: informational charts, not fate-selling
- Clear CTAs (not card soup):
  - **Incognito chart** — one-off, no save
  - **Saved members** — signed-in family/self charts
  - **Kundli Milan** — compatibility
  - **Panchang** (optional cross-link)

---

### S10 — Birth form (Incognito or New member)

**Purpose:** Collect birth data for chart compute.  
**Fields:** Name (members) · Date · Time · Place (geocode autocomplete) · Chart style preference (North / South Indian) optional.  
**CTA:** Cast chart (brass).  
**Tone:** Calm form on panel/glass; no marketplace upsell.

---

### S11 — Chart detail

**Purpose:** Show computed Jyotish chart.  
**Sections (one job each):**
1. Identity header (name, birth meta)
2. North Indian **or** South Indian chart diagram
3. Planets / houses summary
4. Dasha timeline (Vimshottari)
5. Yogas / aspects (compact)
6. Life-area verdicts + prediction prose (narrated from facts)
7. **Pressure → Practice** card — bridge chart stress to Gita / sādhana / Madhav (single composition, not a promo sticker)
8. CTA: Ask Madhav about this chart

**Disclaimer (muted chrome):** Informational only — not medical or financial advice.

---

### S12 — Kundli Milan

**Purpose:** Compatibility between two charts.  
**Layout:** Two birth forms or member pickers → score / guna breakdown → soft guidance → optional Madhav. Ungated (free).

---

### S13 — Panchang (day)

**Purpose:** Today’s Vedic calendar elements.  
**Show:** Tithi, Nakshatra, Yoga, Karana, Sunrise/sunset (as available), VOTD lean note.  
**CTA:** Open month calendar.

---

### S14 — Panchang calendar (month)

**Purpose:** Observances / festivals / ekadashi markers on a month grid. Calm calendar — not event-app clutter.

---

### S15 — Verse of the Day

**Purpose:** Dedicated VOTD reading. Glass verse block + link to full sloka + optional email opt-in (account).

---

### S16 — Favorites

**Purpose:** Saved verses. Surface list → S05. Empty state: lotus ornament + “Verses you keep will live here.”

---

### S17 — Sādhana (daily practice)

**Purpose:** Daily practice loop.  
**Structure:**
1. Today’s verse (short)
2. Silent sit timer / duration choice
3. Honest reflection line
4. Practice type chips: flow · japa · sit · pranayama · meditation (subtle, not pill cluster overload)
5. Streak with **grace days** (soft, not gamified fire emoji)

**Tone:** Discipline without hustle culture.

---

### S18 — Japa

**Purpose:** Mala / mantra counting. Large count, brass progress ring or beads metaphor (restrained), reset / target. Mantra text in Devanagari when relevant.

---

### S19 — Meditation hub

**Purpose:** Progressive sitting course.  
**Tracks:** Days 1–45  
- Foundation 1–7  
- Habit 8–21  
- Deepening 22–45  
+ Always-unlocked **dailies**

**Layout:** Course progress (simple, not dashboard) · day list · milestone markers at 7 / 21 / 45 (private, calm).

---

### S20 — Meditation player

**Purpose:** Guided sit.  
**UI:** Day title · duration · TTS / silence phases · mood before/after (simple) · complete. Large play controls; minimal chrome; atmosphere photo optional behind veil.

---

### S21 — Paths list

**Purpose:** Themed 7-day Gita journeys.  
**Paths:**
- `anxiety-7` — Anxiety
- `grief-7` — Grief
- `purpose-7` — Purpose
- `relationships-7` — Relationships
- `student-7` — Student life

**Layout:** Photo path tiles + title + “7 days” eyebrow. One CTA per tile: Begin / Continue.

---

### S22 — Path detail / day

**Purpose:** Day content inside a path — verse + reflection prompt + complete. Linear progress (Day N of 7).

---

### S23 — Community / Sangha

**Purpose:** Model A community — **not** a social feed.  
**Content:** WhatsApp / Telegram / weekly live markers, intention copy, link to Care. No likes, no infinite scroll posts as primary.

---

### S24 — Care (crisis)

**Purpose:** Safety spine. Helplines (India-focused), calm urgent typography, no astrology, no Madhav sales pitch. High contrast, clear phone/links.

---

### S25 — Support / Dāna

**Purpose:** Voluntary support + transparency.  
**Content:** Why free forever · cost transparency · donate links (Open Collective / GitHub Sponsors / Razorpay as configured) · Sustainer badge is recognition only.  
**Tone:** Grateful, never guilt or paywall threat.

---

### S26 — Account

**Purpose:** Profile & preferences.  
**Sections:**
- Auth: Guest state · Google · Email
- Public profile: handle, avatar presets (`lotus` · `conch` · `wheel` · `diya` · `veena` · `peacock`)
- Preferences: theme, language, VOTD email, notifications
- Streak summary (secondary)
- Shared reflections management
- Export / Delete account
- Links: Privacy, Community, Support

---

### S27 — Public profile `/u/[handle]`

**Purpose:** Sparse public presence — avatar, handle, optional shared reflections. No vanity metrics wall.

---

### S28 — Privacy / Delete account

Legal clarity, calm forms, irreversible delete confirmation.

---

### S29 — Admin moderation (maintainer only)

Queue of reported reflections: content · triage suggestion · actions (approve / remove / block). Utilitarian, still on-brand (void/field/brass), not a separate admin theme.

---

## 6. Feature requirements (functional)

### 6.1 Gita Explore
- 701 verses; Sanskrit, IAST, Hindi, English
- Chapter browse + search
- Favorites, journal, reading cursor, verse completions
- Share + OG verse images (web)

### 6.2 Mood matcher
- 18 moods → tag-scored verse lists
- Optional chart-aware mood ordering API

### 6.3 Ask Madhav (AI)
- Streaming chat (SSE)
- Pipeline: crisis detect → retrieve verses **or** chart context → stream → citation verify
- Guest `sessionId`; merge on sign-in
- Chart-linked chat skips Gita RAG; uses two-voice UI
- Crisis: regex helplines, **no LLM astrology language**

### 6.4 Astrology / Jyotish
- Swiss Ephemeris compute: planets, houses, Vimshottari dashas, yogas, aspects, D9/D10, KP, Lal Kitab hooks, panchang hooks, life-area verdicts
- LLM narrates fact packs only — never invents placements/dates
- Incognito sessions (~6h ephemeral) vs saved members (DB)
- Kundli Milan ungated
- Pressure→Practice bridge

### 6.5 Practice
- Sādhana daily loop + grace-day streaks
- Japa counter
- Meditation course 1–45 + dailies; TTS + silence; mood before/after
- Five 7-day paths

### 6.6 Lifestyle
- Daily panchang + month calendar
- Verse of the Day (+ optional email cron)

### 6.7 Account & safety
- Anonymous / Google / Email
- Guest→account merge (chat, progress, sadhana, meditation, journeys)
- Report/block + moderation (feature-flagged)
- Care helplines
- Privacy + delete

### 6.8 Monetization
- Free forever; nothing functionally locked
- Dāna only; Sustainer = cosmetic badge

---

## 7. Key UI components inventory (for Stitch components)

| Component | Description |
|-----------|-------------|
| `BrandMark` | Lotus leaf |
| `BrandWordmark` | MindKshetra wordmark |
| `Atmosphere` | Photo + teal/brass washes + veil |
| `Screen` / `MainShell` | Page frame |
| `Panel` / `Glass` / `Surface` | Elevation primitives |
| `Button` | Primary brass / secondary outline / ghost / danger |
| `Eyebrow` | 11px uppercase Latin label |
| `EmptyState` | Ornament + title + body |
| `SlokaCard` | Verse preview row/card hybrid — prefer surface row |
| `MoodTile` | Tinted selectable mood |
| `PathTile` | Photo + scrim + title |
| `PageHero` / `PageHeroImage` | Section heroes |
| `MadhavFab` | Brass circular FAB with glyph + pulse |
| `MessageBubble` | User / Madhav / crisis |
| `ChartEpigraph` | Two-voice top line |
| `ZodiacRing` | Astrology brand motif |
| `NorthIndianChart` / `SouthIndianChart` | Chart diagrams |
| `DashaTimeline` | Horizontal/vertical dasha track |
| `PressurePracticeCard` | Chart→practice bridge |
| `BirthForm` | Date/time/place |
| `MeditationPlayer` | Sit controls |
| `AuthButton` | Account entry |
| `Nav` / `TabBar` | Navigation chrome |

---

## 8. Microcopy bank (EN)

| Surface | Copy |
|---------|------|
| Tagline | Clarity from the Gita, for the battlefield of the mind. |
| Home invite | Meet the mind where it is — with a verse, a chart, or a quiet sit. |
| Mood header | How are you feeling? |
| Madhav subtitle | A guide grounded in the Gita |
| Madhav disclaimer | Madhav is not a therapist. If you are in crisis, please seek help. |
| Chart disclaimer | Informational only — not medical or financial advice. |
| Provenance | Read alongside your chart |
| Favorites empty | Verses you keep will live here. |
| Sādhana | One verse. One sit. One honest line. |
| Support | Free forever. Sustained by dāna. |
| Care | You are not alone. Reach someone who can help now. |
| Guest CTA | Continue as guest |
| Milan | Kundli Milan — compatibility without a paywall |

---

## 9. Content entities (for realistic mock data in designs)

- **Sloka:** `id`, `chapter`, `verse`, `sanskrit`, `iast`, `hindi`, `english`
- **Mood:** `id`, `label`, `labelHi`
- **Chat message:** `role`, `content`, optional `chartEpigraph`, `citations[]`
- **Chart member:** `name`, `birthDate`, `birthTime`, `place`
- **Dasha:** `lord`, `start`, `end`
- **Path:** `id`, `title`, `days[7]`
- **Meditation day:** `day`, `title`, `durationMin`
- **Panchang:** `tithi`, `nakshatra`, `yoga`, `karana`
- **Profile avatar keys:** lotus, conch, wheel, diya, veena, peacock

---

## 10. Platform-specific notes for designers

### Mobile (priority for Stitch)
- Tabs: Home · Explore · Mood · Astrology
- Madhav = FAB modal, not a tab
- Safe areas + `contentBottom` so FAB never covers last list row
- Onboarding gate before tabs
- Haptics on favorite/complete/FAB

### Web
- Richer top nav + Practice primary link
- Madhav full page `/madhav`
- OG share images for verses
- Admin moderation desktop-friendly

### Accessibility
- Reduce-motion respected globally
- Contrast: `text-soft` for readable secondary; `text-muted` only for chrome
- Hit targets ≥ 44px on mobile
- Don’t rely on color alone for favorite/complete

---

## 11. Success metrics (product, not vanity UI)

- Verse opens / mood→verse completions
- Madhav sessions with citations present
- Chart casts with Pressure→Practice follow-through
- Sādhana / meditation day completions
- Guest→signed-in merge rate
- Crisis path reach (Care opens) without AI leakage
- Dāna conversions (optional, never gated)

---

## 12. Google Stitch prompt pack (app-focused)

**Use these files — one pasteable prompt per mobile screen:**

| Doc | Path |
|-----|------|
| App one-pager | [`APP-FOCUS-STITCH.md`](./APP-FOCUS-STITCH.md) |
| Master style | [`stitch-prompts/00-master-style.md`](./stitch-prompts/00-master-style.md) |
| Screens 01–25 | [`stitch-prompts/01-onboarding.md`](./stitch-prompts/01-onboarding.md) … `25-account.md` |

**Order:** paste master style → generate P0 (Home, Mood, Sloka, Madhav, Astrology) → then P1/P2.

### Master style prompt (mobile)
```
Mobile app UI for MindKshetra — iPhone 390×844, dark spiritual companion.
Brand: lotus leaf + wordmark hero-level. Madhav: portrait + glyph FAB (never letter-M).
Colors: void #07090f, field #0e1420, brass #c9a227 only, teal #3d7a6a atmosphere only.
Type: Fraunces · Sora · Noto Serif Devanagari. Tabs: Home · Explore · Mood · Astrology + Madhav FAB.
No purple, emoji chrome, stats dashboard, or hero card soup.
```

---

## 13. Out of scope for current UI generation
- Circles (Model B) — design frozen until product gates
- Aggressive social feed
- Paywalled meditation library
- Astrologer marketplace
- Non-India helpline localization (Care can note expansion later)

---

## 14. Appendix — Route map

### Web
`/` · `/explore` · `/explore/[chapter]` · `/sloka/[id]` · `/mood` · `/mood/[id]` · `/madhav` · `/astrology` · `/astrology/incognito` · `/astrology/members` · `/astrology/members/new` · `/astrology/members/[id]` · `/astrology/milan` · `/panchang` · `/panchang/calendar` · `/sadhana` · `/meditation` · `/meditation/[day]` · `/meditation/daily/[id]` · `/paths` · `/paths/[id]` · `/verse-of-the-day` · `/favorites` · `/account` · `/account/reflections` · `/u/[handle]` · `/community` · `/care` · `/support` · `/privacy` · `/delete-account` · `/admin/moderation`

### Mobile
Tabs + stacks mirroring above; Madhav as modal; onboarding route; deep link `mindkshetra://auth/callback`

---

**End of PRD**  
Use this document as the single source of truth when generating UI in Google Stitch. Prefer mobile frames first, then adapt Home / Explore / Madhav / Astrology / Sloka to desktop web.
