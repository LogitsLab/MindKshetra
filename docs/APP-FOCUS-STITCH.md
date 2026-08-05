# MindKshetra — App-focused Stitch brief (mockup-aligned)

**Client:** Mobile · **Frame:** 390×844  
**Visual target:** Premium dark navy + metallic gold lotus boards (like your onboarding / meditation / astrology / journal / profile decks)  
**Complete Stitch pack:** [`STITCH-COMPLETE.md`](./STITCH-COMPLETE.md) · **Prompts:** [`stitch-prompts/`](./stitch-prompts/) · **Setup:** [`STITCH-SETUP.md`](./STITCH-SETUP.md)  
**Migration 021:** applied on Supabase (`achievements` catalog verified live)


---

## Product
**MindKshetra — Your Spiritual Companion**  
Tagline: Clarity from the Gita, for the battlefield of the mind.

Jobs: Mood→verses · Ask Madhav · Jyotish + Panchang/Muhurats · Meditation/Japa/Sādhana · Journal · calm progress

---

## Visual DNA (from your references)
| Token | Spec |
|-------|------|
| Ground | Midnight charcoal / navy |
| Accent | Metallic gold / brass only |
| Brand | Gold **lotus blossom** + serif wordmark |
| Type | Serif titles · sans UI · Devanagari for Sanskrit |
| Boards | Sidebar story + 5 phone frames + bottom value strip |
| Photos | Temple sunrise, mist lake, stars, mountains — cinematic scrims |
| CTAs | Wide gold buttons · Skip links on onboarding |

---

## Generate these first (boards)

| # | Prompt | Matches your deck |
|---|--------|-------------------|
| 01 | `01-onboarding.md` | 5-step personalization |
| 26 | `26-meditation-board.md` | Meditation 5 phones |
| 27 | `27-astrology-panchang-board.md` | Panchang / muhurat / horoscope |
| 28 | `28-journal-board.md` | Journal & reflections |
| 29 | `29-profile-progress-board.md` | Profile / badges / streak / settings |
| 02 | `02-home.md` | Home hub |
| 34–35 | web desktop frames | Home + Personalize/Progress |

**Implemented (code):** shared personalization + achievements APIs (`021_*.sql`), app 5-step onboarding, account achievements/progress, web `/welcome` + `/account/personalize` + tracking pages, `/journal`, muhurat API + lifestyle astrology routes. Apply migration `021_personalization_achievements.sql` on Supabase.


Then single phones: Madhav `08` · Sloka `05` · Mood `06` · Chart `11` · Muhurats `30` · Horoscope `31` · Journal `32` · Streak `33`

---

## How to regenerate in Stitch
```bash
STITCH_API_KEY=… node scripts/generate-stitch-screens.mjs boards
```
Or paste each file’s fenced prompt after the master style in `00-master-style.md`.

---

## Soften vs arcade
Streaks/badges/levels appear **like your decks**, but keep tone seeker-dignified (no fire emoji spam, no purple Calm clone, no paywalls).
