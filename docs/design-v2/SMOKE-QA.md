# UI 2.0 smoke QA

Manual checklist after `ui-v2` rebuilds. Versions: app + web **2.0.0**.

## App (Expo)

1. Fresh install / clear onboarding → welcome → goals → inspirations → time → setup → guest/auth → Home.
2. Home shows brand + invite, VOTD, four path tiles (Mood / Madhav / Practice / Astrology), no streak hero.
3. Tabs: Home · Explore · Mood · Astrology only; Madhav opens via FAB.
4. Mood grid select → verse list; Astrology hub tithi + CTAs; Madhav chat two-voice reply.
5. Meditation hub → player → complete with Great/Good/Neutral/Low text chips.
6. Account → Progress (grace-day copy) → Achievements (no paywall locks).

## Web

1. `/welcome` → Personalize or Continue to Home.
2. `/` brand home + Ask Madhav CTA in nav.
3. Explore / Madhav / Astrology / Journal / Account personalize·progress·achievements match dark brass system.

## Visual QA vs Stitch

Open `docs/design-v2/references/<slug>/screen.png` beside the live route for spot checks on Home, onboarding steps, Mood, Astrology, Madhav, Meditation complete, Progress.
