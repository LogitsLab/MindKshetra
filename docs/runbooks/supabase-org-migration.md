# Runbook — Supabase org migration (2026-08-06)

Clean cutover into org **MindKshetra** (`delcnnkybmiabotarcnv`). No user-data
import. Old Logitslab free projects were paused to free the 2-project limit.

## New projects

| Role | Name | Ref | Region |
|------|------|-----|--------|
| Dev | MindKshetra-dev | `awqvyohcdxamkacwlsnq` | ap-northeast-1 |
| Prod | MindKshetra-prod | `bpxszivjvexmqznnshlx` | ap-northeast-1 |

- Dev URL: `https://awqvyohcdxamkacwlsnq.supabase.co`
- Prod URL: `https://bpxszivjvexmqznnshlx.supabase.co`
- Lean audio (prod bucket):  
  `https://bpxszivjvexmqznnshlx.supabase.co/storage/v1/object/public/audio`

Schema on both: migrations **001–022** via `npm run db:migrate -- <ref>`.

## Auth

Configured via Management API (email, anonymous, Google; site URL + redirect
allowlists matching previous mind-dev / mind hosts).

**Google Cloud Console (manual, once):** add authorized redirect URIs for the
existing OAuth client:

- `https://awqvyohcdxamkacwlsnq.supabase.co/auth/v1/callback`
- `https://bpxszivjvexmqznnshlx.supabase.co/auth/v1/callback`

Keep the old project callbacks until old projects are deleted.

## Audio (egress policy)

- Public bucket `audio` on **prod only**
- Contents: `manifest.json` + 701 `recitation/*.m4a` + `ambient/meditation-drone.m4a`
- **No** `tts/` (do not re-run `audio:tts`)
- Both stacks set `*_AUDIO_BASE_URL` to the new prod public base
- **Follow-up:** move lean audio to Cloudflare R2 and flip `*_AUDIO_BASE_URL`
  so Supabase Storage egress cannot blow the free quota again

## Env surfaces updated

- Vercel Production + Preview/`dev` (+ generic Preview)
- Local web `.env` / `.env.local` / `.env.dev`
- App `.env.local` / `.env.dev` / `.env.example`
- `MindKshetra-app/eas.json` (`dev-backend` + `production`)

Local secrets: `MindKshetra/.secrets/new-org-migration.env` (gitignored).

## Old projects (paused)

| Old | Ref | Status after cutover |
|-----|-----|----------------------|
| MindKshetra-dev | `xtadssxgwskyobxmhnxa` | INACTIVE (paused) |
| MindKshetra (prod) | `rqknmgzdzjpxepjmbzvb` | INACTIVE (paused) |

Delete after ~1 week of healthy soak on the new org. Restoring an old project
requires pausing a new one first (free-tier 2-project limit).

## Smoke checklist

1. Redeploy web (env vars apply on next deploy): mind-dev + mind production
2. Google / magic-link sign-in on web + Expo
3. VOTD loads; Listen plays Sanskrit recitation
4. Journal write; Madhav chat (needs Groq — unchanged)
5. Confirm Google redirect URIs added (above)
