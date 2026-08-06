import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

function authErrorRedirect(origin: string, code: string): NextResponse {
  const url = new URL("/account", origin);
  url.searchParams.set("auth_error", code);
  return NextResponse.redirect(url);
}

function successRedirect(request: NextRequest, next: string): NextResponse {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  if (!isLocal && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}

/**
 * PKCE auth callback for magic links and OAuth.
 * Supabase redirects here with ?code=…; we exchange it for a session cookie.
 *
 * Cookies must be written onto the redirect `NextResponse` itself. Writing only
 * via `cookies().set()` from `next/headers` often drops Set-Cookie on the
 * redirect (supabase-js ≥2.91 also defers SIGNED_IN), so the browser lands on
 * /account still signed out — or exchange fails and shows authLinkFailed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const errorCode =
    searchParams.get("error_code") || searchParams.get("error");
  if (errorCode && !code) {
    return authErrorRedirect(
      origin,
      errorCode === "otp_expired" || errorCode === "access_denied"
        ? "otp_expired"
        : "auth_failed"
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return authErrorRedirect(origin, "auth_failed");
  }

  if (!code) {
    return authErrorRedirect(origin, "auth_failed");
  }

  const response = successRedirect(request, next);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    return response;
  }

  console.error("[auth/callback] exchangeCodeForSession", error.message);
  const message = error.message.toLowerCase();
  if (message.includes("expired") || message.includes("invalid")) {
    return authErrorRedirect(origin, "otp_expired");
  }
  return authErrorRedirect(origin, "auth_failed");
}
