-- Shared reflections (plan Phase 3, first UGC surface).
--
-- journal_entries stays the single source: sharing is a visibility flip, not
-- a copy. Private-by-default is STRUCTURAL — the existing own-row policy
-- ("journal_own", migration 003) keeps covering writes and private reads;
-- the one new permissive SELECT policy below only ever exposes rows the
-- author explicitly shared AND that survived screening. Policies OR
-- together, so nothing else changes.

alter table journal_entries
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private', 'shared')),
  add column if not exists status text not null default 'published'
    check (status in ('published', 'held', 'removed')),
  add column if not exists held_reason text,
  add column if not exists shared_at timestamptz;

create index if not exists journal_entries_shared_idx
  on journal_entries (sloka_id, shared_at desc)
  where visibility = 'shared' and status = 'published';

drop policy if exists "journal_shared_read" on journal_entries;
create policy "journal_shared_read" on journal_entries
  for select using (visibility = 'shared' and status = 'published');
