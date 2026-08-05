# Design v3 — Ship readiness scorecard

**Date:** 2026-08-04  
**Web branch:** `feat/home-atmosphere-sit`  
**Mobile branch:** `dev`  
**Verdict:** **Shippable for Design v3 completeness** after P0/P1 gap-close. P2 Stitch PNG regen remains deferred.

---

## Completeness vs Design v3 MUST INCLUDE

| Surface | Status |
|---------|--------|
| Web full companion Home | Pass |
| Web WelcomeGate demoted | Pass |
| Web Account shell + Personalize (hydrated) | Pass |
| Web Progress / Achievements (real APIs) | Pass |
| App 6-step onboarding | Pass |
| App full Home lifestyle hub | Pass |
| Tabs ×4 + Madhav FAB | Pass |
| Horoscope / Transits content pages | Pass (were shells; now chart-backed) |
| Journal discovery (mobile) | Pass (`/journal` from Account) |
| Madhav chart path = astrology-only | Pass (intentional demerge documented) |
| Design tokens (void/brass/Fraunces/Sora) | Pass |
| Stitch PNG regen for gap singles | Deferred (P2) |

**Completeness:** ~95% of Design v3 MUST INCLUDE. Remaining is P2 visual regen / soft restyles.

---

## Unit tests

| Suite | Result |
|-------|--------|
| Web vitest | **275 / 275 pass** |
| Mobile jest | **138 / 138 pass** |
| Typecheck (web + mobile `tsc`) | Pass |

---

## Design-v3 smoke (Phase 2A)

### Web (local `npm run dev` + static)

| Check | Result |
|-------|--------|
| `/` brand + Practice / Madhav / Explore CTAs | Pass |
| Six path tiles + Sadhana + meditation + Japa/Panchang + Together + VOTD + moods + Madhav band | Pass (diff-guard) |
| No forced `/welcome` redirect | Pass (`WelcomeGate` → `null`; `/` → 200) |
| `/account/personalize` hydrates prefs | Pass (loads `/api/account/preferences`) |
| Progress / Achievements no fake “1,204 Sessions” | Pass (only in Stitch HTML mocks) |
| Nav Explore · Mood · Practice · Astrology · Ask Madhav · More | Pass |

### App (static / code)

| Check | Result |
|-------|--------|
| Onboarding welcome→goals→inspirations→time→setup→account | Pass |
| Home lifestyle sections (diff-guard) | Pass |
| Tabs ×4; Madhav FAB | Pass |
| Account → Personalize / Progress / Achievements / Journal | Pass |

---

## API smoke (local + prod)

| Endpoint | Local | Prod |
|----------|-------|------|
| `GET /` | 200 | 200 |
| `/api/panchang` | 200 | 200 |
| `/api/votd/today` | 200 | — |
| `/api/moods` | 200 | — |
| `/api/slokas?chapter=1` | 200 | — |
| `/api/astrology/muhurat` | 200 | — |
| `/api/astrology/health` | 200 | 200 |
| `/api/meditation/catalog` | 200 | — |
| `POST /api/chat` (Gita) | 200 SSE + citations | — |
| `POST /api/chat` (crisis) | 200 helplines only | — |
| Lifestyle pages horoscope/transits/muhurat | 200 | — |

Merge routes present: `chat`, `progress`, `sadhana`, `meditation`, `journeys`.

---

## Primary journeys (auth-matrix)

| Journey | Guest | Signed-in | Notes |
|---------|-------|-----------|-------|
| Mood → sloka | Pass* | Pass* | Routes + APIs live; interactive auth not exercised in CI |
| Explore → chapter → sloka | Pass* | Pass* | |
| Madhav stream + citations | Pass | Pass | Live local SSE |
| Madhav crisis | Pass | Pass | Helplines; no chart upsell |
| Madhav + chart | — | Pass* | API astrology-only path |
| Horoscope / Transits | Pass* | Pass | Content UIs; need member/incognito for data |
| Muhurat / Panchang | Pass | Pass | |
| Sadhana + japa `#japa` | Pass* | Pass* | Hash target exists |
| Meditation / Paths | Pass* | Pass* | |
| Personalize save → reopen | — | Pass* | Hydration wired |
| Guest → merge | — | Pass* | Routes present; live merge not manually signed-in |
| Care (no astrology body) | Pass | Pass | Madhav only in global nav |

\* = verified by route/API/code wiring; full manual signed-in UI click-through recommended before store submit.

---

## Gaps closed this pass

1. Web + mobile Horoscope/Transits real UIs (chart-backed)
2. Personalize hydration from `/api/account/preferences` (web + mobile); removed web dead duplicate UI
3. Mobile Account → `/journal` write surface
4. Madhav two-voice accepted as intentional demerge (legacy SSE display retained)
5. `astrologyApi.muhurat` wrapper; Home Practice/Explore CTAs always visible
6. Removed unused onboarding slides

---

## Known P2 deferrals (non-blocking)

- Stitch PNG regen for gap singles without forcing API spend
- Soft restyle Community / Care / Support vs deferred prompts
- Circles (Model B) frozen
- Mobile guest Horoscope/Transits still need sign-in or incognito cast (by design — no persisted guest members)

---

## Blockers vs shippable

**No P0 blockers remaining** for Design v3 completeness.

**Recommend before store/production cut:** one manual signed-in pass on device (Google OTP, member chart → horoscope/transits/predictions, personalize reopen, journal write, guest merge after anonymous progress).
