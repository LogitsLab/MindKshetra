# Nonprofit kickoff — owner checklist

Code can't do these. Every item here is external process with lead time, which
is why they start on day 1 even though the product work they unlock (the
`/support` page's UPI block, Sustainer badges, community links) ships later.
Work the tracks in parallel — none block each other.

## Track 1 — Money rails (longest lead time, start first)

### International / developer donations (live in days, no entity needed)

- [ ] Apply to [Open Collective](https://opencollective.com/create) under the
      **Open Source Collective** fiscal host. The fiscal host is the legal
      entity, so this works before (and independent of) any Indian
      registration. Approval is typically days for an active AGPL project.
- [ ] Enable **GitHub Sponsors** on the `LogitsLab` org (payouts via Stripe;
      available to Indian maintainers). Add a `FUNDING.yml` to both repos once
      live.
- [ ] When either is live: tell the dev team — the `/support` page (plan
      Phase 1) links these first, before UPI exists.

### Indian entity + UPI donations (weeks to months)

- [ ] Decide the vehicle with a CA/CS professional: **Section 8 company**
      (heavier compliance, strongest credibility for grants/CSR) vs
      **registered public charitable trust** (lighter, faster). Get advice —
      this checklist is not legal counsel.
- [ ] Register the entity → PAN → bank account in the entity's name.
- [ ] Apply for **12A + 80G** (donor tax deduction) once registered — 80G
      materially helps Indian fundraising.
- [ ] **Razorpay** onboarding on the entity account: business KYC, then a
      hosted **Payment Link / donation page** (no SDK integration needed for
      v1). Subscriptions need RBI e-mandate approval — defer; one-time dāna
      is v1.
- [ ] **FCRA rule — do not mix streams.** Foreign contributions to an Indian
      nonprofit require FCRA registration (hard to get, easy to violate).
      Keep it structural: international money → Open Collective / GitHub
      Sponsors; Indian UPI/cards → the Indian entity via Razorpay. Never
      route one into the other's account.
- [ ] When Razorpay KYC clears: give the dev team the Payment Link URL — the
      dark UPI block on `/support` flips on with a content change.

## Track 2 — Community channels (an afternoon)

- [ ] Create a **WhatsApp Channel** (broadcast): "MindKshetra — daily verse".
      One-way by design; zero moderation load.
- [ ] Create a **Telegram group** (discussion): weekly verse thread, satsang
      coordination. Set it to admin-approval join initially.
- [ ] Enable **GitHub Discussions** on both repos (builders + future
      translation program).
- [ ] Hand the two invite links to the dev team for: `SiteFooter.tsx`, the
      VOTD email footer (`lib/votd-email.ts`), and the store listings.
- [ ] Daily ritual (~2 min): post the day's verse to the Channel — reuse the
      Verse of the Day + its OG card image
      (`https://mind.logitslab.com/api/og/verse/<id>`).
- [ ] Weekly ritual: Sunday discussion prompt in Telegram (the week's verse +
      one question).

## Track 3 — Partnerships (grow warm, not cold)

First outreach to 2–3 of each; a working relationship with one of each kind
beats a list of twenty:

- [ ] **Mental-health NGOs** (e.g. orgs behind helplines you'd want in the
      care path) — ask: may we list you in our helpline directory; would you
      review our crisis-path copy? This buys credibility and safety review at
      once.
- [ ] **Temple trusts / satsang groups** — audience + venues for the monthly
      online satsang; a Gita-native partner also sanity-checks cultural copy
      (Kundli Milan phrasing, festival conventions).
- [ ] **College clubs** (philosophy/yoga/wellness societies) — future homes
      for the "battlefield of the mind" campus pack; for now, one pilot
      circle per campus.

Outreach note that works: what MindKshetra is (free forever, open source,
no ads), what you're asking for (small, specific), what you offer back
(free tool for their community, named credit on the transparency page).

## Track 4 — Rhythm (once channels exist)

- [ ] Announce the first **monthly online satsang** (Meet/YouTube live,
      30–45 min: one verse, one sit, Q&A). Consistency beats production
      value — same week each month.
- [ ] Monthly **transparency ritual**: update infra costs in
      `data/transparency.json` (Vercel, Supabase, Groq, Voyage, Resend,
      Apple/Play fees, domain) once the `/support` page ships.
- [ ] Monthly **impact review**: run `docs/impact-metrics.md` queries;
      publish one honest paragraph to Discussions/Telegram.

## Already done in code (this branch)

- Paywall neutralized — Kundli Milan API is ungated; `entitlements` table
  repurposed for Sustainer **recognition only** (nothing functional ever
  locks).
- First-party event instrumentation live on both clients + privacy pages
  updated; impact queries in `docs/impact-metrics.md`.
- CSRF/rate-limit hardening that community write-endpoints will rely on.
