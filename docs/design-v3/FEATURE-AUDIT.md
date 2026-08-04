# Design v3 — Feature ↔ Prompt Audit

**Branch:** `feat/design-complete-v3`  
**Rules:** Full companion Home (never 4-tile-only). Web personalize = settings only. App = detailed onboarding. Madhav = FAB/CTA, never a 5th tab.

**Stitch status legend:** `HAVE` = PNG in `docs/stitch-output/`; `MISS` = prompt only; `REWRITE` = prompt updated for v3 completeness.

---

## Product rules (locked)

| Surface | Rule |
|---------|------|
| Web Home | Full companion hub restyled |
| Web onboarding | No multi-step wizard; optional CTA; personalize under Account |
| Web Account | Profile + Progress + Achievements + Personalize form |
| App onboarding | Detailed: welcome → goals → inspirations → time → setup → account |
| App Home | Full lifestyle hub; restyle without stripping |
| IA | Tabs Home · Explore · Mood · Astrology; Madhav FAB/CTA |

---

## Web Home (`/`) — MUST INCLUDE

| Feature | Code | Prompt | Stitch | Gap |
|---------|------|--------|--------|-----|
| Brand hero (lotus + MindKshetra) | `HomePageClient` hero | `34-web-home` | HAVE→REWRITE | Old prompt only 4 tiles |
| Tagline + invite | hero | `34-web-home` | REWRITE | — |
| CTAs: Practice / Madhav / Explore | hero | `34-web-home` | REWRITE | Was missing Practice CTA detail |
| Path tiles ×6: Explore, Mood, Meditation, Madhav, Astrology, Paths | paths grid | `34-web-home` | REWRITE | Was 4 tiles only |
| Sadhana flagship + practice streak | lifestyle | `34-web-home` + `49-web-practice-sadhana` | REWRITE / NEW | Missing from old web home |
| Meditation continue | lifestyle | `34-web-home` | REWRITE | Missing |
| Japa / Course / Panchang tiles | lifestyle | `34-web-home` | REWRITE | Missing |
| Together: Community, Care, Support, Account | together | `34-web-home` | REWRITE | Was “optional footer” only |
| Verse of the Day | VOTD section | `34-web-home` | REWRITE | Keep glass panel |
| Mood preview chips | mood section | `34-web-home` | REWRITE | Missing |
| Closing Madhav band | close | `34-web-home` | REWRITE | Missing |
| **Forbidden on Home** | — | — | — | Stats/streak hero, badge row, dashboard cards |

---

## Web Account / gamification

| Feature | Route / code | Prompt | Stitch | Notes |
|---------|--------------|--------|--------|-------|
| Profile / auth / prefs | `/account` | `50-web-account-shell` NEW | NEW | Desktop account shell |
| Personalize (single form) | `/account/personalize` | `35-web-personalize-progress` | HAVE→REWRITE | Settings page, not wizard |
| Progress | `/account/progress` | `35` + `45` | HAVE | Real API stats; no placeholders |
| Achievements | `/account/achievements` | `41-web-achievements` | HAVE | Fix hardcoded footer stats in code |
| Journal | `/journal` | `40-web-practice-journal` | HAVE | — |
| Favorites / reflections | account links | `15-favorites` | MISS | Deferred phone; web uses existing UI |
| Forced WelcomeGate | `/welcome` | `36-web-onboarding-welcome` | HAVE→REWRITE | **Demote:** optional invite only; gate neutralized in code |

---

## Web secondary routes

| Feature | Route | Prompt | Stitch | Priority |
|---------|-------|--------|--------|----------|
| Explore / sloka | `/explore`, `/sloka/[id]` | `37-web-explore-sloka`, `03`, `05` | HAVE / MISS | P0 |
| Mood | `/mood` | `06`, `07` | HAVE / MISS | P0 |
| Madhav | `/madhav` | `38-web-madhav-desktop` | HAVE | P0 |
| Astrology suite | `/astrology` + muhurat/horoscope/transits | `39`, `30`, `31` | HAVE / MISS | P0 |
| Practice / Sadhana | `/sadhana` | `49-web-practice-sadhana` NEW, `16` | NEW / MISS | P0 |
| Panchang | `/panchang` | `13` | MISS | P1 |
| Meditation | `/meditation` | `18`, `19` | HAVE | P1 |
| Community / Care / Support | `/community`, `/care`, `/support` | `22–24` | MISS | P1 (keep existing; light restyle) |
| Paths | `/paths` | `20`, `21` | MISS | P1 |
| Japa | `/japa` or sadhana | `17` | MISS | P1 |
| Birth form / Milan / Chart | astrology | `10–12` | MISS / HAVE | P2 |

---

## App Home

| Feature | Code | Prompt | Stitch | Notes |
|---------|------|--------|--------|-------|
| Brand + streak chip | `home.tsx` | `02-home` | HAVE→REWRITE | Streak chip OK in header; no stats hero |
| Hero CTAs Madhav / Explore | home | `02-home` | REWRITE | — |
| VOTD | home | `02` + `14` | HAVE / MISS | — |
| Sadhana | home | `02` + `16` | REWRITE / MISS | MUST INCLUDE |
| Meditation continue | home | `02` + `18` | REWRITE | MUST INCLUDE |
| Japa / Panchang / Paths / Community | lifestyle grid | `02` | REWRITE | MUST INCLUDE (was stripped in ui-v2) |
| 6 path tiles | home | `02` | REWRITE | Not 4 |
| Mood chips | home | `02` + `06` | REWRITE | — |
| Closing Madhav | home | `02` | REWRITE | — |
| Tabs + Madhav FAB | chrome | `00-master-style` | — | Locked |

---

## App onboarding (detailed — KEEP)

| Step | Lists / fields | Prompt | Stitch |
|------|----------------|--------|--------|
| welcome | Continue / Skip | `46-onboarding-welcome` | HAVE |
| goals | 9 goals from `lib/personalization.ts` | `47-onboarding-goals` | HAVE |
| inspirations | 6 + No Preference | `48-onboarding-inspirations` | HAVE |
| time | 5 / 10 / 20 / 30 / 60+ | `42-onboarding-time` | HAVE |
| setup | EN/HI, guidance ×3, name | `43-onboarding-setup` | HAVE |
| account | Google / email / guest | board `01` / setup | HAVE |
| **Post-onboarding Personalize** | Edit prefs without full replay | NEW app route | Code: add settings entry |

---

## App account / gamification

| Feature | Route | Prompt | Stitch |
|---------|-------|--------|--------|
| Account hub | `/account` | `25-account` | HAVE |
| Achievements | `/account/achievements` | `29` board / `41` | HAVE |
| Progress / streak | `/account/progress` | `33`, `45` | HAVE |
| Journal | `/journal` | `28`, `32` | HAVE / MISS |
| Personalize settings | `/account/personalize` | NEW | Implement parity with web |

---

## Ungenerated singles — ship vs defer

| Slug | Decision |
|------|----------|
| `03-explore`, `04-chapter`, `05-sloka` | Design HTML mock in v3; implement light restyle from tokens |
| `07-mood-detail`, `10-birth-form`, `12-milan` | Deferred Stitch; existing code remains |
| `13-panchang`, `14-votd`, `15-favorites` | Prompt ready; HTML mock for panchang/votd |
| `16-sadhana`, `17-japa`, `20-paths`, `21-path-day` | MUST for Home completeness; HTML mocks + code keep features |
| `22-community`, `23-care`, `24-support` | Soft restyle; defer full Stitch |
| `30-muhurats`, `31-horoscope`, `32-journal-today` | Prompt ready; code already has routes |

---

## Gate A checklist

- [x] Matrix covers web Home full feature list
- [x] Web personalize = settings; Welcome demoted
- [x] App onboarding lists complete vs `personalization.ts`
- [x] Missing singles classified ship vs defer
- [x] Prompts rewritten (see `docs/stitch-prompts/` v3 updates)

**Stitch API:** `STITCH_API_KEY` not available in this environment. Design-v3 ships HTML reference frames + rewritten prompts; run `node scripts/generate-stitch-screens.mjs web --force` when the key is set.
