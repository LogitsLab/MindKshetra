import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deprecated: superseded by /api/journeys/[id]/run.
 *
 * This route wrote `path_runs` while the paths UI and milestones read
 * `journey_runs`, so a day marked here was invisible everywhere — and it had
 * neither the server-side unlock check nor a rate limit. Kept as a redirect
 * only so a shipped mobile build (which wraps this path) keeps working until
 * it updates; it forwards rather than duplicating the write, so there is one
 * writer and one table.
 */
function forward(request: NextRequest, id: string): NextResponse {
  const url = new URL(request.url);
  url.pathname = `/api/journeys/${encodeURIComponent(id)}/run`;
  // 308 preserves the method and body, so a POST stays a POST.
  return NextResponse.redirect(url, 308);
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return forward(request, id);
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return forward(request, id);
}
