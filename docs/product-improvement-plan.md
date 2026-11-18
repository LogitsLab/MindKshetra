# MindKshetra — detailed product improvement plan

**Status:** implemented (Nov 2026) · **Date:** Nov 2026  
**Scope:** Web (`MindKshetra/`) + mobile (`MindKshetra-app/`)  
**Principle:** One clear next action · web↔mobile parity · ship or hide · no social feed

This expands the R&D canvas into concrete file-level changes, ordered for shipping.

---

## Goals

1. Fix discoverability and first-week confusion (search, tabs, guest value).
2. Close half-shipped loops (prefs that cron can’t honor, gated community UI).
3. Deepen return habits (widgets, wallpapers, festival deep links) without new product pillars.
4. Align japa / practice deep links across platforms.

**Out of scope:** in-app feed, DMs, leaderboards, guilt streaks, Watch (P2+ only).

---

## Phase 0 — Clarity & parity (2–3 weeks)

### 0.1 Mobile verse search

**Why:** Web Explore searches verses; mobile only filters chapters. Store listing implies search.

| Change | Files |
|--------|--------|
| Add search field that calls `/api/slokas?q=` | `MindKshetra-app/app/(tabs)/explore/index.tsx` |
| Reuse `contentApi.slokas({ q })` (extend if needed) | `MindKshetra-app/src/api/endpoints.ts` |
| Result list → `/sloka/[id]`; empty + “did you mean” if API returns them | Mirror `MindKshetra/components/ExploreSearch.tsx` |
| Offline fallback: filter local chapter titles only; show “Search needs connection” for verse q | `MindKshetra-app/src/i18n/namespaces/gita.ts` |
| Maestro / unit: search query hits API shape | `MindKshetra-app/src/api/__tests__/endpoints.test.ts`, optional e2e |

**Acceptance:** Typing “fear” / Hindi token returns verse cards; tapping opens sloka; clearing query restores chapter grid + tag filter.

---

### 0.2 Home vs Practise information architecture (mobile)

**Why:** Practise tab is the same lifestyle grid as Home.

| Change | Files |
|--------|--------|
| **Home** = “today story” only: VOTD, continue (verse/path/listen), one festival/panchang chip, Madhav/sādhana CTA | `MindKshetra-app/app/(tabs)/home.tsx` |
| **Practise** = ritual hub: sādhana, japa, meditation, prāṇāyāma, mood — grid only, no duplicate VOTD carousel | `MindKshetra-app/app/(tabs)/practise.tsx`, `PracticeLifestyleGrid.tsx` |
| Optional: promote **Explore** onto Path tab rail or second row CTA on Home (“Open the Gita”) | `home.tsx`, `path.tsx` |
| Copy: tab labels / subtitles if needed | `MindKshetra-app/src/i18n/namespaces/shared.ts` (or sadhana) |

**Acceptance:** Home and Practise screens share ≤1 overlapping primary block; first-time tester can say what each tab is for in one sentence.

---

### 0.3 Guest local streak + soft upgrade

**Why:** Best return loop is signed-in-only; guests feel practice is discarded.

| Change | Files |
|--------|--------|
| Persist guest practice days locally (IST day stamp) | `MindKshetra-app/src/storage/local.ts` |
| Show streak chip on Home for guests | `home.tsx` |
| Soft CTA after day 2–3: “Keep this streak on your account” → account/sign-in | i18n + `NotificationPrompt`-style sheet or inline Panel |
| On upgrade, merge guest streak into server (extend merge if needed) | `AuthContext.tsx`, `MindKshetra/app/api/account/streak` or sadhana merge |
| Web: optional guest streak in `localStorage` on sadhana complete | `SadhanaClient.tsx` |

**Acceptance:** Guest completes sādhana/japa two days → sees “2”; after sign-in, streak ≥ guest days (no double-count bugs).

---

### 0.4 Web japa + prāṇāyāma route parity

**Why:** Mobile `/japa`, `/pranayama`; web only `/sadhana#japa`. Deep links break.

| Change | Files |
|--------|--------|
| Add `/japa` page that mounts existing `JapaPanel` (or extract shared panel) | `MindKshetra/app/japa/page.tsx`, refactor from `SadhanaClient.tsx` |
| Add `/pranayama` page (port mobile flow or thin wrapper calling same practice log) | `MindKshetra/app/pranayama/page.tsx`, `MindKshetra-app/app/pranayama.tsx` as reference |
| Update home tiles / sitemap / Nav “More” if needed | `HomePageClient.tsx`, `Nav.tsx`, `sitemap.ts` |
| Redirect old `#japa` still works | keep anchor on `/sadhana` |

**Japa UX alignment (optional within 0.4):**

| Gap | Web today | Target |
|-----|-----------|--------|
| Past target | Stops | Keep stop on web **or** add “another round” button (prefer explicit button, not silent loop) |
| Local lifetime/today beads | Missing | Optional: mirror mobile `japa-stats` in `localStorage` |
| Tap target | Circle only | Keep (web); document in FEATURE-AUDIT |

**Acceptance:** `mindkshetra.in/japa` and `/pranayama` load; mobile deep links to same paths open via Universal Links / app scheme where configured.

---

### 0.5 Ops: festival column + honesty pass

| Change | Files |
|--------|--------|
| Apply `023_festival_reminders.sql` in Supabase (manual) | `MindKshetra/supabase/migrations/023_festival_reminders.sql` |
| Verify cron + prefs end-to-end once | `vercel.json`, `/api/cron/festival-reminders` |
| Either hide **astrologyAlerts** until transit cron is real, or label “Coming soon” | Account UIs web + mobile |

**Acceptance:** Opt-in festival toggle persists; undocumented prefs don’t claim live push.

---

### Phase 0 exit checklist

- [x] Mobile verse search works online  
- [x] Home ≠ Practise jobs  
- [x] Guest streak visible + merge  
- [x] Web `/japa` + `/pranayama`  
- [x] Festival migration applied *(023 on MindKshetra-dev + MindKshetra-prod)*  
- [x] Typecheck both apps; smoke Explore + sādhana + japa  

---

## Phase 1 — Return loops (4–6 weeks)

### 1.1 Android VOTD widget

| Change | Files |
|--------|--------|
| Expo widgets Android config / provider | `MindKshetra-app/app.json` expo-widgets plugin, `widgets/VerseOfTheDay.tsx` |
| Sync from Home (same as iOS) | `src/widgets/syncVerseOfTheDay.ts` |
| EAS build profile note in store docs | `docs/STORE_CHECKLIST.md` |

**Acceptance:** Android Home Screen shows today’s verse after opening app once; tap opens app (deep link to sloka if supported).

---

### 1.2 iOS widget polish

| Change | Files |
|--------|--------|
| Reload timeline at local midnight / on foreground | `syncVerseOfTheDay.ts`, home focus effect |
| Accessory sizes copy QA | `widgets/VerseOfTheDay.tsx` |
| Document: requires production/dev client build, not Expo Go | `docs/STORE_CHECKLIST.md` |

---

### 1.3 Mobile wallpapers

| Change | Files |
|--------|--------|
| Port web wallpaper catalog | `MindKshetra/data/wallpapers.json` → app `src/data/wallpapers.ts` |
| New screen `/wallpapers` + share/save via `expo-sharing` / media library | `MindKshetra-app/app/wallpapers.tsx` |
| Entry from Practise or Profile | `PracticeLifestyleGrid` / account |
| Permissions copy (photo library already partly declared) | `app.json` |

**Acceptance:** User can open, preview, share a wallpaper from the app.

---

### 1.4 Transit reminders (ship or remove)

**Option A — Ship**

| Change | Files |
|--------|--------|
| Migration: `transit_reminders` on `notification_preferences` | new `024_transit_reminders.sql` |
| Wire prefs API + Account toggles | `notification-preferences/route.ts`, account UIs |
| Implement `dispatchTransitReminders` | `lib/notifications/dispatch.ts`, replace stub in `transit-reminders/route.ts` |
| Vercel cron schedule | `vercel.json` |
| Copy: companionship, never causation | `lib/push-copy.ts` |

**Option B — Remove**

| Change | Hide/remove astrologyAlerts UI until ready; leave stub cron documented |

**Acceptance:** Pref matches reality (live push **or** no toggle).

---

### 1.5 Continue rails on Home

| Change | Files |
|--------|--------|
| Single “Continue” row: verse · path day · chapter listen resume | `home.tsx` (mobile), `HomePageClient.tsx` (web) |
| Prefer server cursor + local listen resume keys | Existing progress + `mindkshetra-chapter-listen-*` |

**Acceptance:** If user left mid-chapter or mid-path, Home shows one primary continue control.

---

### 1.6 Festival campaign deep links

| Change | Files |
|--------|--------|
| Festival push `data.url` → VOTD, path, or verse | Already partially in festival dispatch — refine |
| Named creatives for Gita Jayanti / Ekadashi (content, not code-heavy) | `data/festivals.json` stories, Madhav today |
| Optional in-app banner on festival day | Home panchang chip |

**Acceptance:** Tap festival notification lands on a relevant screen, not a dead route.

---

### Phase 1 exit checklist

- [ ] Android widget build verified  
- [ ] Wallpapers on mobile  
- [ ] Transit: shipped **or** UI removed  
- [ ] Home continue rail  
- [ ] Festival notification deep-link QA  

---

## Phase 2 — Selective depth

| Item | Status | Notes |
|------|--------|-------|
| Plain-words → more verses | Done (Nov 2026) | ~60 flagships EN/HI in web + mobile JSON |
| Multi-bhāṣya compare | Done | Curated `bhashya-compare.json` on 2.20, 2.47, 2.48, 4.7, 9.22, 18.66 |
| SSR / indexable horoscope hubs | Done | Server intros; `noindex` cleared; sitemap lists hubs |
| Soft sangha | Done (remove CTAs) | Private journal only; `SOFT_SANGHA_UI=false` |
| Madhav festival voice | Done | Gita Jayanti + Ekadashi openings/starters |
| Expand japa web stats | Done | `lib/japa-stats.ts` + JapaPanel lifetime/today |
| Apple Watch | Deferred | Low |

---

## Cross-cutting standards (every phase)

| Area | Rule |
|------|------|
| i18n | EN + HI keys; run parity tests both apps |
| Kill switches | Community: ship on **or** hide UI completely |
| Crons | Never expose a user toggle for a stub dispatcher |
| App Store | Submit for Review only as Saksham in ASC browser (not API key) |
| Deploy | Web: `vercel --prod` after phase slices; mobile: EAS when native plugins change (widgets) |
| Tests | Typecheck both; add/adjust unit tests for search + streak merge |

---

## Suggested work order (tickets)

1. **MK-P0-1** Mobile verse search  
2. **MK-P0-2** Home / Practise split  
3. **MK-P0-3** Guest streak + upgrade CTA  
4. **MK-P0-4** Web `/japa` + `/pranayama` (+ light japa “another round”)  
5. **MK-P0-5** Apply festival SQL + prefs honesty  
6. **MK-P1-1** Continue rail  
7. **MK-P1-2** Mobile wallpapers  
8. **MK-P1-3** Android widget + iOS polish  
9. **MK-P1-4** Transit ship-or-remove  
10. **MK-P1-5** Festival deep-link QA / creatives  
11. **MK-P2-*** Content + optional depth  

---

## Explicit non-goals

- Social feed, comments threads, DMs  
- Competitive leaderboards / streak guilt copy  
- Replacing Madhav with a generic chatbot  
- Full Spotify-style audio library  
- Rebuilding astrology from scratch  

---

## Dependencies / risks

| Risk | Mitigation |
|------|------------|
| Widget needs native rebuild | Bundle with next TestFlight / Play upload |
| Guest streak merge double-count | Idempotent day keys (IST) |
| Verse search rate limits | Debounce + reuse web API limits |
| Community enablement | Moderation queue already exists — still needs ops owner |
| Transit push without chart | Only users with saved self chart |

---

## Definition of done (whole plan)

Phase 0 + Phase 1 complete when:

1. A new mobile user can **search a verse**, **practice on Practise**, **see a guest streak**, and **open japa from the same URL shape as web**.  
2. Return surfaces (widget / wallpaper / continue / festival) work without lying prefs.  
3. Both apps typecheck; web prod deployed; mobile store build when widgets ship.

---

*Companion overview canvas: `mindkshetra-product-rd-plan` in Cursor canvases.*
