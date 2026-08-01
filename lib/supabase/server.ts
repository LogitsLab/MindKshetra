import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { supabaseEnvConfigured } from "@/lib/supabase/require";

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
}

/** Mobile clients send `Authorization: Bearer <access_token>`. */
export function getBearerToken(): string | null {
  const auth = headers().get("authorization");
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  const token = match?.[1]?.trim();
  return token || null;
}

function createBearerClient(token: string): SupabaseClient {
  return createSupabaseClient(supabaseUrl(), supabaseAnonKey(), {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Supabase client for the current request.
 * Prefer Bearer JWT (mobile) when present; otherwise cookie session (web).
 */
export async function createClient(): Promise<SupabaseClient> {
  const token = getBearerToken();
  if (token) {
    return createBearerClient(token);
  }

  const cookieStore = cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* Server Component — ignore */
        }
      },
    },
  });
}

let warnedUnconfigured = false;

async function getRequestUser(): Promise<User | null> {
  // No Supabase env → no sessions exist → every request is signed out.
  // Without this, client construction below throws and guest-capable routes
  // (chat, incognito charts, streak/sadhana GET) 500 on deployments that
  // deliberately run without Supabase. Routes that hard-require Supabase
  // return an actionable 503 via lib/supabase/require.ts instead.
  if (!supabaseEnvConfigured()) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — treating all requests as signed out (see .env.example)"
      );
    }
    return null;
  }

  const token = getBearerToken();
  if (token) {
    const supabase = createBearerClient(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function getAuthUserId(): Promise<string | null> {
  const user = await getRequestUser();
  return user?.id ?? null;
}

/** Signed-in non-anonymous user id (favorites / progress / journal style). */
export async function getSignedInUserId(): Promise<string | null> {
  const user = await getRequestUser();
  if (!user || user.is_anonymous) return null;
  return user.id;
}
