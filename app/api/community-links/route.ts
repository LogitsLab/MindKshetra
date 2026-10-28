import { NextResponse } from "next/server";
import { communityLinksFromEnv } from "@/lib/community-links";

export const dynamic = "force-dynamic";

/** Invite links for the app community screen. Both are public URLs. */
export function GET() {
  return NextResponse.json(communityLinksFromEnv(process.env), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
