# MindKshetra Design Kit v3

**Branch:** `feat/design-complete-v3`  
**Stitch project:** `5437926231206475980` (MindKshetra Flow v2)  
**Audit:** [`FEATURE-AUDIT.md`](FEATURE-AUDIT.md)

## Why v3

v2 web Home prompts generated a **4-tile stub** that omitted Sadhana, Japa, Panchang, Paths, Community, mood preview, and Madhav close band. v3 prompts require the **full companion** feature list. Web onboarding is **settings-only**; app keeps detailed onboarding.

## Tokens

Same DNA as [`../design-v2/tokens-from-stitch.md`](../design-v2/tokens-from-stitch.md) / [`../../DESIGN.md`](../../DESIGN.md): void `#07090f`, brass `#c9a227`, Fraunces + Sora, glass panels, hairline lists.

## Route map

| Slug | Route | Status |
|------|-------|--------|
| `34-web-home` | `/` | designed (prompt REWRITE + HTML ref) |
| `49-web-practice-sadhana` | `/sadhana` | designed (NEW prompt + HTML ref) |
| `50-web-account-shell` | `/account` | designed (NEW prompt + HTML ref) |
| `35-web-personalize-progress` | `/account/personalize`, `/account/progress` | designed (REWRITE) |
| `36-web-onboarding-welcome` | `/welcome` optional | designed (demoted invite) |
| `41-web-achievements` | `/account/achievements` | designed (v2 PNG + code fix) |
| `02-home` | app Home | designed (REWRITE — full lifestyle) |
| `46–48`, `42–43` | app onboarding steps | designed (v2 PNG; lists locked) |
| `03–04`, `07`, `10`, `12–17`, `20–24`, `30–32` | gap singles | deferred Stitch; prompts ready |

## Regen when `STITCH_API_KEY` is set

```bash
STITCH_API_KEY=… node scripts/generate-stitch-screens.mjs web --force
STITCH_API_KEY=… node scripts/generate-stitch-screens.mjs gaps --force
# then copy PNGs into docs/design-v3/references/
```

Until then, use HTML references under [`references/`](references/) + existing v2 PNGs for visual DNA.

## How to use while coding

1. Open `FEATURE-AUDIT.md` MUST INCLUDE for the route.
2. Open matching `references/<slug>/` HTML (and v2 PNG if present).
3. Restyle without deleting features. Ban early-return stub homes.
