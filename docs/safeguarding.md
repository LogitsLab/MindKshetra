# Safeguarding & safety spine (G3)

G3 is a co-requirement for any public UGC. Code already ships a DPDP section
and age posture on the privacy page; this document tracks the **external**
spine that must be named before kill switches flip.

## Checklist

| Item | Owner | Status | Notes |
|---|---|---|---|
| Named grievance officer (public email / address) | steward (TBD) | open | Publish on `/privacy` once entity exists; interim: org contact |
| Clinician or NGO review of crisis-path copy | partner NGO (TBD) | open | Partner via nonprofit-kickoff Track 3; review `/care` + Madhav crisis short-circuit |
| Written under-13 / parental-consent posture | steward (TBD) | open | Beyond privacy blurb |
| Second named steward (circles prerequisite) | steward #2 (TBD) | open | Monthly review; moderation cannot be one human |
| Helpline directory partners listed | steward (TBD) | open | Care path — never replace clinical care |

## Naming protocol (do this, then date a G3 pass)

1. Pick a **grievance officer** (human with email monitored ≤72h). Write name + email into privacy and this table.
2. Ask one mental-health NGO / clinician to review crisis copy on `/care` and Madhav redirects; keep a dated note of their sign-off (email OK).
3. Name a **second steward** who can moderate reports if the first is unavailable. Circles stay design-only until this is filled ([circles-design.md](circles-design.md)).
4. Record `G3 | pass` in [nonprofit-kickoff.md](nonprofit-kickoff.md) only when all three of the above are filled — not when code is ready.

## Crisis posture (product rule)

Madhav short-circuits crisis intents to helplines — it does not counsel as a
therapist. Any “talk to a human mentor” path is **referral**, not treatment.

## Gate record

When the table above is complete, record a dated G3 pass in
[nonprofit-kickoff.md](nonprofit-kickoff.md) before flipping
`COMMUNITY_REFLECTIONS_ENABLED` / `COMMUNITY_REPORTS_ENABLED` on Preview,
then (only after soak + promote) on production.
