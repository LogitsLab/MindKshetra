# Roadmap

MindKshetra is a nonprofit: fully free forever, funded by dāna. The product
thesis: meet mental pressure with Gita clarity, chart awareness, and a
gentle daily practice — together. Strategy detail lives in
[docs/nonprofit-kickoff.md](docs/nonprofit-kickoff.md); open work in
[TODOS.md](TODOS.md); contributor path in
[CONTRIBUTING.md](CONTRIBUTING.md) and
[docs/translations.md](docs/translations.md).

## Direction (locked)

**Chain (do not invert):** chart pressure → Gita guidance → daily practice →
shared sangha.

Keep the moat (**Gita × real Jyotish**). Add **sādhana** and **sangha** as
nonprofit engines for retention, trust, donations, and impact. Lead with a
**free-forever core** (verses, mood, basic Madhav, basic chart); dāna supports
paths, hosting, and circle ops — never aggressive paywalls.

**Explicit non-goals (early):**
- Generic meditation *marketplace* with paywalled library (Calm / Headspace clone)
- Open social feed (moderation hell + brand risk)
- Paid astrologer marketplace (AstroTalk clone; fights AGPL + nonprofit story)
- Turning Madhav into a therapist
- Public gamification — milestones stay private to their user; no points,
  no levels, no leaderboards, by design (presence without performance)

A **free progressive sit course** (`/meditation`, Tier 1 = 7 days) is allowed as
a retention peer to scripture **sādhana** — not a replacement for the
Gita×Jyotish moat, and never behind a paywall.

**Sangha order:** Model A (WhatsApp / Telegram / weekly live) before any
in-app circles. Circles stay launch-frozen until G2 + G3 + a second named
steward. Soak everything on `dev` / [mind-dev.logitslab.com](https://mind-dev.logitslab.com)
before any `dev` → `main` promote (see [docs/dev-soak.md](docs/dev-soak.md)).

## Shipped (on `dev`; promote to production only after soak)

- **Meditation course (v1→v2)** — `/meditation` progressive sitting course
  (foundation 1–7, habit 8–21, deepening 22–45; TTS + silence; mood; unlock;
  guest merge; private milestones at 7/21/45); one-off dailies; peer to
  sādhana — not japa.
- **Practice layer** — Daily Sādhana, japa (grace-day streaks), guest merge;
  themed paths (`/paths`, five journeys + `path_runs`); path day → guided
  sādhana (verse + sit + complete); Meditation tile → `/meditation`.
- **Lifestyle layer** — sunrise-anchored panchang, month calendar,
  festival/ekadashi engine, nakshatra-leaning VOTD.
- **The wedge** — Pressure→Practice card + chart-aware mood ordering;
  optional chart verse as today’s sādhana for signed-in chart users.
- **Model A sangha surface** — `/sangha` (attend → `sangha_attended`), `/care`.
- **Community rails, dark** — shared reflections, moderation, profiles, push
  dispatcher — behind kill switches until G1/G2/G3.
- **Acquisition loops** — related verses, share tracking, VOTD `ref=votd`.
- **Account** — notification prefs + public profile editor; mobile push client
  scaffold (APNs/FCM still owner-gated).

## Gated launches (not date-driven)

Community surfaces unlock on measured practice, not on a calendar — gates
G1/G2/G3 (weekly practitioners, sangha attendance, safety spine) are
defined in [docs/nonprofit-kickoff.md](docs/nonprofit-kickoff.md). Until a
gate passes its surface stays dark regardless of code readiness.

- Shared reflections public by default — behind G1 + G3.
- In-app circles (sanghas) — behind G2 + G3 + a second named steward.
- Festival/push broadcasts — behind their gate rows.

## Next (on `dev` until soak)

- Model A sangha ops: WhatsApp / Telegram / weekly live (page `/sangha` shipped).
- Wire donate + channel env URLs on Preview; money rails (OC / Sponsors / entity).
- G3 external spine — [docs/safeguarding.md](docs/safeguarding.md).
- Mobile parity for gated-off features as their gates clear (E7 web-first).
- More themed paths after anxiety-7 usage; audio + new languages only with named stewards.
- In-app circles only after G2 + G3 + second steward — [docs/circles-design.md](docs/circles-design.md).
- **Promote `dev` → `main` only after** [docs/dev-soak.md](docs/dev-soak.md) sign-off.

## How to influence this

Open an issue with the feature template, or pick up a
`good first issue`. The maintainer reviews impact metrics monthly against
the gates; roadmap changes happen there, in the open.
