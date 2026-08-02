# Circles (Model B) — design only until gates pass

**Status:** launch-frozen. Do not open a migration PR until:

1. G2 passes (≥25 distinct `sangha_attended` / week × 4 full consecutive weeks)
2. G3 safety spine is complete ([safeguarding.md](safeguarding.md))
3. A second named steward is on the roster
4. Model A (WhatsApp / Telegram / weekly live) has proven retention

Flipping ahead of gates is a strategy regression (amendment A2).

## Target schema (when unlocked)

- `circles` — id, slug, title, theme, host_user_id, created_at
- `circle_members` — circle_id, user_id, role (`host`/`member`), status
- `circle_posts` — prompted only (one prompt/day), not a free-form feed
- RLS via `SECURITY DEFINER is_circle_member()` + **two-user RLS tests**
  (Docker ET13 debt) — first migration where a policy bug leaks private content

## Product rules

- Limited reactions (blessing-style), no likes race
- Host tools: approve, pin weekly reading, mute
- Optional: host shares a sanitized Madhav excerpt as the week’s teaching
- Later: city chapters / `community_events` RSVP

Until then: run sangha on `/sangha` + external channels only.
