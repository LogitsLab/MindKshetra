-- Festival / Ekadashi opt-in reminders (plan Phase 3).
-- Opt-in only: default false. Apply in the Supabase SQL editor. Idempotent.

alter table notification_preferences
  add column if not exists festival_reminders boolean not null default false;
