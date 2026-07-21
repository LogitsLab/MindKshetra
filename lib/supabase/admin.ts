import { createClient } from "@supabase/supabase-js";

/** Service-role client for seed scripts and admin ops only. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function pingDatabase(): Promise<boolean> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !key) return false;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.from("slokas").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
