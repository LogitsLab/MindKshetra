import { NextResponse } from "next/server";

/**
 * Actionable 503s for deployments without Supabase env.
 *
 * lib/supabase/server.ts and lib/supabase/admin.ts throw at client
 * construction when their env vars are missing, which surfaces as a bodyless
 * 500 from every route that needs them. Routes that cannot do anything
 * without Supabase call `requireSupabase()` as the first line of the handler
 * and return the 503 it produces:
 *
 *   const unconfigured = requireSupabase();      // or { admin: true }
 *   if (unconfigured) return unconfigured;
 *
 * This is purely the unconfigured-deployment path — when env is present the
 * guard is a no-op. Routes with a real Supabase-less mode (guest chat,
 * incognito charts, content from JSON) must NOT use it; they degrade via
 * lib/supabase/server.ts treating every request as signed out instead.
 */

/** URL + anon key — what every request-scoped Supabase path needs. (Mirrors lib/content/source.ts supabaseConfigured.) */
export function supabaseEnvConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

/** The above plus the service-role key `createAdminClient` requires. */
export function supabaseAdminEnvConfigured(): boolean {
  return (
    supabaseEnvConfigured() &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  );
}

/**
 * Null when Supabase is configured; a 503 JSON response to return verbatim
 * when it is not. Pass `{ admin: true }` from handlers that also construct
 * `createAdminClient` (service-role writes/reads).
 */
export function requireSupabase(
  opts: { admin?: boolean } = {}
): NextResponse | null {
  const configured = opts.admin
    ? supabaseAdminEnvConfigured()
    : supabaseEnvConfigured();
  if (configured) return null;
  return NextResponse.json(
    {
      error:
        "Supabase is not configured on this deployment — see .env.example",
    },
    { status: 503 }
  );
}
