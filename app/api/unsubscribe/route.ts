import { NextResponse, type NextRequest } from "next/server";
import {
  UnsubscribeConfigError,
  verifyUnsubscribeToken,
} from "@/lib/notifications/unsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabase } from "@/lib/supabase/require";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email unsubscribe, token = HMAC(user_id, UNSUB_SECRET).
 *
 * GET  ?token=…  — tiny confirmation page: a form that POSTs back. No
 *                  client JS; mail scanners that prefetch GETs change nothing.
 * POST           — flips user_preferences.votd_email_enabled to false.
 *                  Accepts the confirmation form AND RFC 8058 one-click
 *                  (List-Unsubscribe-Post: List-Unsubscribe=One-Click), where
 *                  the token rides the URL query.
 */

function page(title: string, bodyHtml: string, status = 200): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title} · MindKshetra</title>
</head>
<body style="margin:0;background:#faf7f0;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
<div style="max-width:480px;margin:0 auto;padding:64px 24px;">
<p style="letter-spacing:0.16em;text-transform:uppercase;font-size:12px;color:#8a6a2f;margin:0 0 12px;">MindKshetra</p>
${bodyHtml}
</div>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const INVALID_BODY = `<h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">This link is no longer valid</h1>
<p style="font-size:15px;line-height:1.6;color:#444;margin:0;">The unsubscribe link could not be verified. You can turn off Verse of the Day emails anytime in Account settings on MindKshetra.</p>`;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  try {
    const userId = verifyUnsubscribeToken(token);
    if (!userId) return page("Unsubscribe", INVALID_BODY, 400);
  } catch (err) {
    if (err instanceof UnsubscribeConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  return page(
    "Unsubscribe",
    `<h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">Stop the daily verse email</h1>
<p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 24px;">You will no longer receive the Verse of the Day by email. You can turn it back on anytime in Account settings.</p>
<form method="post" action="/api/unsubscribe">
<input type="hidden" name="token" value="${escapeAttr(token)}" />
<button type="submit" style="background:#8a6a2f;color:#faf7f0;border:none;padding:12px 24px;font-size:15px;font-family:inherit;cursor:pointer;">Unsubscribe</button>
</form>`
  );
}

export async function POST(request: NextRequest) {
  const unconfigured = requireSupabase({ admin: true });
  if (unconfigured) return unconfigured;

  // Token from the confirmation form body, else from the query string
  // (RFC 8058 one-click POSTs to the List-Unsubscribe URL as-is).
  let token = request.nextUrl.searchParams.get("token") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData().catch(() => null);
    const formToken = form?.get("token");
    if (typeof formToken === "string" && formToken) token = formToken;
  } else if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (typeof body?.token === "string" && body.token) token = body.token;
  }

  let userId: string | null = null;
  try {
    userId = verifyUnsubscribeToken(token);
  } catch (err) {
    if (err instanceof UnsubscribeConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }
  if (!userId) return page("Unsubscribe", INVALID_BODY, 400);

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        votd_email_enabled: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (error) {
    console.warn("[unsubscribe] write failed:", error.message);
    return page(
      "Unsubscribe",
      `<h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">Something went wrong</h1>
<p style="font-size:15px;line-height:1.6;color:#444;margin:0;">We could not update your preference just now. Please try the link again, or turn off Verse of the Day emails in Account settings.</p>`,
      500
    );
  }

  return page(
    "Unsubscribed",
    `<h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">You are unsubscribed</h1>
<p style="font-size:15px;line-height:1.6;color:#444;margin:0;">The Verse of the Day email will stop. The verse itself remains at mind.logitslab.com whenever you want it.</p>`
  );
}
