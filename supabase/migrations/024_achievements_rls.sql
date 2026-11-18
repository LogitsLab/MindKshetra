-- Fix Supabase advisor rls_disabled_in_public on achievements.
--
-- Migration 021 created the catalog table but only enabled RLS on
-- user_achievements. Without RLS, anon/authenticated grants (PostgREST
-- defaults) allow full read/write/delete of the catalog via the project URL.
--
-- Catalog is public-read only (same pattern as slokas/tags/moods). Writes stay
-- service-role (no insert/update/delete policies). Idempotent.

alter table public.achievements enable row level security;

drop policy if exists "achievements_public_read" on public.achievements;
create policy "achievements_public_read" on public.achievements
  for select using (true);
