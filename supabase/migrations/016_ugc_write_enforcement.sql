-- UGC write enforcement: the DATABASE is now the boundary for publishing.
--
-- WHY: RLS alone left the moderation screen bypassable. "journal_own" (003)
-- is FOR ALL, so any user could PATCH visibility='shared', status='published'
-- on their own rows directly via PostgREST with their JWT — skipping the
-- API's screenText() entirely. And the 015 public SELECT policy exposed ALL
-- columns of shared rows (including user_id) to anyone. After this migration:
--
--   * The publishing columns AND the reflection text of a published row are
--     writable only by the service role — the API is the sole publish path
--     (app/api/journal/[id]/route.ts). UPDATE is revoked entirely from client
--     roles: no app path performs a client-role journal UPDATE today, and a
--     text-edit grant would let an author publish a clean reflection through
--     screening and then rewrite it to unscreened content via PostgREST.
--   * Public reads of shared reflections go through the API with the admin
--     client (app/api/slokas/[id]/reflections/route.ts); anon/authenticated
--     keep only the own-row policy.
--
-- DEPLOY ORDER (required): deploy the application code FIRST, then apply this
-- migration. New code is fully compatible with the old schema (all publish
-- writes/reads already use the service role); old code against the new schema
-- would silently no-op its share/unshare updates. See "Promotion to
-- production" in docs/dev-environment.md.
--
-- ROLLBACK (operator note — forward-only conventions cannot undo grants):
--   grant insert, update on journal_entries to authenticated;
--   create policy "journal_shared_read" on journal_entries
--     for select using (visibility = 'shared' and status = 'published');
--   alter table public_profiles drop constraint public_profiles_handle_reserved;
--   drop index if exists moderation_queue_open_report_key;
--   drop index if exists moderation_queue_open_hold_key;
-- Required only if app code is rolled back to a pre-016 build.

-- Column-level write grants: authenticated may create entries; nothing
-- client-side may touch the publishing columns or edit text post-hoc.
-- DELETE and SELECT grants are unchanged (own-row RLS still scopes both).
revoke insert, update on journal_entries from anon, authenticated;
grant insert (user_id, sloka_id, reflection) on journal_entries to authenticated;

-- Public read policy gone: shared-reflection reads are API-only now.
drop policy if exists "journal_shared_read" on journal_entries;

-- Reserved handles, enforced at the DB so no non-API write path can claim
-- one. MUST stay in sync with RESERVED_HANDLES in lib/profiles.ts
-- (test/reserved-handles.test.ts pins the two lists together).
-- Pre-clean: a reserved handle may already have been claimed via direct
-- PostgREST writes (the exact threat this migration closes); ADD CONSTRAINT
-- validates existing rows, so rename offenders first instead of aborting
-- the whole migration mid-promotion.
update public_profiles
set handle = handle || '_' || left(user_id::text, 6)
where handle in (
  'admin', 'administrator', 'moderator', 'mod', 'madhav', 'krishna',
  'mindkshetra', 'logitslab', 'support', 'help', 'official', 'team',
  'staff', 'root', 'system', 'api', 'www', 'about', 'privacy', 'account',
  'everyone', 'all'
);

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
-- Pre-clean: the pre-016 report route had no dedupe, so duplicate open rows
-- are exactly what existing data holds — resolve the extras first or the
-- index creation aborts the whole migration.
with ranked as (
  select id,
         row_number() over (
           partition by content_type, content_id, reported_by
           order by created_at
         ) as rn
  from moderation_queue
  where status = 'open' and source = 'report' and reported_by is not null
)
update moderation_queue
set status = 'resolved', resolution = 'no_action', resolved_at = now()
where id in (select id from ranked where rn > 1);

create unique index if not exists moderation_queue_open_report_key
  on moderation_queue (content_type, content_id, reported_by)
  where status = 'open' and source = 'report' and reported_by is not null;

-- Same backstop for screening holds (source='screen_hold', reported_by null):
-- concurrent share attempts on one entry must not stack duplicate open rows.
with ranked_holds as (
  select id,
         row_number() over (
           partition by content_type, content_id
           order by created_at
         ) as rn
  from moderation_queue
  where status = 'open' and source = 'screen_hold'
)
update moderation_queue
set status = 'resolved', resolution = 'no_action', resolved_at = now()
where id in (select id from ranked_holds where rn > 1);

create unique index if not exists moderation_queue_open_hold_key
  on moderation_queue (content_type, content_id)
  where status = 'open' and source = 'screen_hold';

-- The push dispatcher's keyset scan filters on the notif flags 48 times a
-- day; without this partial index every tick heap-scans all of
-- user_preferences instead of just the opted-in rows.
create index if not exists user_preferences_notif_optin_idx
  on user_preferences (user_id)
  where notif_daily_verse or notif_streak_reminder;
