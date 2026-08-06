import { NextResponse, type NextRequest } from "next/server";

/**
 * Mobile OAuth / magic-link return.
 *
 * Expo Go cannot use a stable custom scheme, and Supabase Auth rejects
 * `exp://192.168.x.x/...` redirects (private IP). The app therefore points
 * `redirectTo` here. `WebBrowser.openAuthSessionAsync` captures this HTTPS
 * URL (with `?code=`) before or as the page loads — we must NOT exchange the
 * PKCE code on the server (the verifier lives in the app).
 */
export async function GET(request: NextRequest) {
  const { search, hash } = new URL(request.url);
  const query = `${search}${hash}`;
  const deepLink = `mindkshetra://auth/callback${query}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MindKshetra</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #07090f;
      color: #f2efe6;
      font-family: Georgia, "Times New Roman", serif;
      text-align: center;
      padding: 32px;
    }
    p { margin: 0 0 12px; line-height: 1.45; }
    a {
      color: #c9a227;
      text-decoration: none;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      letter-spacing: 0.04em;
    }
  </style>
</head>
<body>
  <div>
    <p>Returning to MindKshetra…</p>
    <p><a href="${deepLink}">Open the app</a></p>
  </div>
  <script>
    try { window.location.replace(${JSON.stringify(deepLink)}); } catch (e) {}
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
