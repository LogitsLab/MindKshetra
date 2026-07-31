-- UGC write enforcement: the DATABASE is now the boundary for publishing.
--
-- WHY: RLS alone left the moderation screen bypassable. "journal_own" (003)
-- is FOR ALL, so any user could PATCH visibility='shared', status='published'
-- on their own rows directly via PostgREST with their JWT — skipping the
-- API's screenText() entirely. And the 015 public SELECT policy exposed ALL
-- columns of shared rows (including user_id) to anyone. After this migration:
--
--   * The publishing columns (visibility, status, held_reason, shared_at)
--     are writable only by the service role — the API is the sole publish
--     path (app/api/journal/[id]/route.ts).
--   * Public reads of shared reflections go through the API with the admin
--     client (app/api/slokas/[id]/reflections/route.ts); anon/authenticated
--     keep only the own-row policy.

-- Column-level write grants: authenticated may create entries and edit their
-- text; nothing client-side may touch the publishing columns. DELETE and
-- SELECT grants are unchanged (own-row RLS still scopes both).
revoke insert, update on journal_entries from anon, authenticated;
grant insert (user_id, sloka_id, reflection) on journal_entries to authenticated;
grant update (reflection) on journal_entries to authenticated;

-- Public read policy gone: shared-reflection reads are API-only now.
drop policy if exists "journal_shared_read" on journal_entries;

-- Reserved handles, enforced at the DB so no non-API write path can claim
-- one. MUST stay in sync with RESERVED_HANDLES in lib/profiles.ts.
alter table public_profiles drop constraint if exists public_profiles_handle_reserved;
alter table public_profiles add constraint public_profiles_handle_reserved
  check (handle not in (
    'admin', 'administrator', 'moderator', 'mod', 'madhav', 'krishna',
    'mindkshetra', 'logitslab', 'support', 'help', 'official', 'team',
    'staff', 'root', 'system', 'api', 'www', 'about', 'privacy', 'account',
    'everyone', 'all'
  ));

-- Report dedupe backstop: at most one OPEN user report per (content, user).
-- The API pre-checks, but only this index holds under concurrent inserts;
-- the API treats 23505 from it as success.
create unique index if not exists moderation_queue_open_report_key
  on moderation_queue (content_type, content_id, reported_by)
  where status = 'open' and source = 'report' and reported_by is not null;
