# MindKshetra Design Kit v2 (Stitch → Product)

**Stitch project:** `5437926231206475980` (MindKshetra Flow v2)  
**Source exports:** [`../stitch-output/`](../stitch-output/)  
**This kit:** PNG/HTML references for visual QA while coding UI 2.0.

## Nav lock

App tabs: **Home · Explore · Mood · Astrology** (active = brass).  
Madhav = FAB / web CTA only — never a 5th tab.

## Route map + status

| Status | Meaning |
|--------|---------|
| `todo` | Not rebuilt against Stitch yet |
| `in_progress` | Being rebuilt |
| `done` | Visually aligned with reference |

### App (Expo)

| Slug | App route | Status |
|------|-----------|--------|
| `02-home` | `/(tabs)/home` | done |
| `05-sloka` | `/sloka/[id]` | todo |
| `06-mood-grid` | `/(tabs)/mood` | done |
| `08-madhav` | `/madhav` | done |
| `09-astrology-hub` | `/(tabs)/astrology` | done |
| `11-chart-detail` | astrology member chart | done |
| `18-meditation-hub` | `/meditation` | done |
| `19-meditation-player` | `/meditation/daily/[id]` | done |
| `44-meditation-complete` | meditation complete state | done |
| `25-account` | `/account` | done |
| `33-streak-progress` | `/account/progress` (streak) | done |
| `45-progress-overview` | `/account/progress` | done |
| `46-onboarding-welcome` | `/onboarding` step welcome | done |
| `47-onboarding-goals` | `/onboarding` step goals | done |
| `48-onboarding-inspirations` | `/onboarding` step inspirations | done |
| `42-onboarding-time` | `/onboarding` step time | done |
| `43-onboarding-setup` | `/onboarding` step setup | done |
| `01-onboarding` | board (narrative QA) | board |
| `26`–`29` | boards (narrative QA) | board |

### Web (Next.js)

| Slug | Web route | Status |
|------|-----------|--------|
| `34-web-home` | `/` | done |
| `36-web-onboarding-welcome` | `/welcome` | done |
| `37-web-explore-sloka` | explore / sloka | done |
| `38-web-madhav-desktop` | `/madhav` | done |
| `39-web-astrology-suite` | `/astrology` | done |
| `40-web-practice-journal` | `/journal` (+ practice links from home) | done |
| `35-web-personalize-progress` | `/account/personalize`, `/account/progress` | done |
| `41-web-achievements` | `/account/achievements` | done |

## References

PNG (and HTML when available) live under [`references/<slug>/`](references/).

## How to use

1. Open the matching `references/<slug>/screen.png` beside the route.
2. Rebuild with existing primitives + tokens (no second design system).
3. Update status in this table when done.
4. Re-generate Stitch via `node scripts/generate-stitch-screens.mjs <slug|gaps|flow> --force` if needed.
