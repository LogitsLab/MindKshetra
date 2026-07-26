-- ceo/T12 — entitlements.
--
-- Deliberately provider-agnostic. eng/E15 (Razorpay merchant onboarding) needs
-- entity registration, business KYC and RBI e-mandate approval — weeks of
-- external process that no code change can shortcut. This schema lets the
-- gating ship and be tested now, so that when a provider is live the only work
-- left is a webhook that writes rows here.
--
-- `source` records WHERE an entitlement came from, so a manual grant (support,
-- testing, a gift) is distinguishable from a paid one and can be audited.

create table if not exists entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- What this unlocks. Kept as text, not an enum: adding a product should not
  -- require a migration.
  feature text not null,
  source text not null default 'manual',
  -- NULL = perpetual. Otherwise the entitlement lapses at this instant.
  expires_at timestamptz,
  -- Provider's identifier, once there is a provider. Unique so a webhook
  -- delivered twice cannot grant twice — payment webhooks retry by design.
  external_ref text unique,
  created_at timestamptz not null default now()
);

create index if not exists entitlements_user_feature_idx
  on entitlements (user_id, feature);

alter table entitlements enable row level security;

-- Read-your-own only. Writes come from the service role via a webhook; a
-- client must never be able to grant itself an entitlement.
drop policy if exists "entitlements_read_own" on entitlements;
create policy "entitlements_read_own" on entitlements
  for select using (auth.uid() = user_id);

comment on table entitlements is
  'ceo/T12. Feature grants. Written only by the service role; never by clients.';
