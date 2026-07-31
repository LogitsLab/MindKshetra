import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

const PRODUCTION_ORIGIN = "https://mind.logitslab.com";

function withCors(response: NextResponse, isApi: boolean): NextResponse {
  if (!isApi) return response;
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function configuredProductionOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  if (configured && !/localhost|127\.0\.0\.1/.test(configured)) {
    return configured;
  }
  return PRODUCTION_ORIGIN;
}

export async function middleware(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");

  if (isApi && request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // Supabase Site URL misconfig lands PKCE ?code= on localhost even when
  // OAuth started on production (verifier cookie is on the prod host).
  const authCode = request.nextUrl.searchParams.get("code");
  if (
    authCode &&
    !isApi &&
    !request.nextUrl.pathname.startsWith("/auth/callback")
  ) {
    const isLocalHost = ["localhost", "127.0.0.1"].includes(
      request.nextUrl.hostname
    );
    const hasVerifier = request.cookies
      .getAll()
      .some((c) => c.name.includes("code-verifier"));

    if (isLocalHost && !hasVerifier) {
      const dest = new URL("/auth/callback", configuredProductionOrigin());
      request.nextUrl.searchParams.forEach((value, key) => {
        dest.searchParams.set(key, value);
      });
      if (!dest.searchParams.has("next")) {
        dest.searchParams.set("next", "/account");
      }
      return NextResponse.redirect(dest);
    }

    const callback = request.nextUrl.clone();
    callback.pathname = "/auth/callback";
    if (!callback.searchParams.has("next")) {
      callback.searchParams.set("next", "/account");
    }
    return NextResponse.redirect(callback);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return withCors(NextResponse.next(), isApi);
  }

  // No Supabase auth cookies (sb-*) means there is no session to refresh —
  // skip the network round-trip that otherwise taxed every guest page click.
  const hasAuthCookies = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasAuthCookies) {
    return withCors(NextResponse.next(), isApi);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Cookie session refresh for web. Bearer mobile clients skip cookies.
  if (!request.headers.get("authorization")?.toLowerCase().startsWith("bearer ")) {
    await supabase.auth.getUser();
  }

  return withCors(response, isApi);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
