# Design v3 smoke QA

## Web

1. `/` — brand hero + Practice / Madhav / Explore CTAs.
2. `/` — six path tiles (Explore, Mood, Meditation, Madhav, Astrology, Paths).
3. `/` — Sadhana card, meditation continue, Japa / Course / Panchang tiles.
4. `/` — Together (Community, Care, Support, Account), VOTD, mood chips, Madhav close band.
5. `/` — **no** forced redirect to `/welcome` on first visit.
6. `/account` — profile + links to Personalize / Achievements / Progress.
7. `/account/personalize` — single form (goals ×9, inspirations, time, guidance); Save.
8. `/account/progress` + `/account/achievements` — real data; no fake “1,204 Sessions”.
9. Nav: Explore · Mood · Practice · Astrology · Ask Madhav · More still discovers Panchang/Sangha/Meditation/Support.

## App

1. Fresh onboarding: welcome → goals (9) → inspirations → time → setup → account.
2. Home still has Sadhana, meditation, Japa, Panchang, Paths, Community, 6 tiles, moods, Madhav band.
3. Tabs: Home · Explore · Mood · Astrology; Madhav via FAB.
4. Account → Personalize settings (edit without full replay) → Progress → Achievements.

## Diff guard

```bash
# Web — must not delete companion sections
rg -n "sadhana|/japa|/panchang|/paths|homeTogether|homeBlockJapa" components/HomePageClient.tsx
# App
rg -n "sadhana|japa|panchang|paths|Community" "app/(tabs)/home.tsx"
```
