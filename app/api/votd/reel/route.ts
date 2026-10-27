import { NextResponse } from "next/server";
import { isMaintainer } from "@/lib/maintainers";
import { getSignedInUserId } from "@/lib/supabase/server";
import { loadTodaysVotdPayload } from "@/lib/votd-email";
import { withVotdAttachments } from "@/lib/votd-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Same reel render budget as the email cron. */
export const maxDuration = 300;

/**
 * Maintainer-only: today's verse reel as a downloadable .mp4, so a human can
 * post it to the WhatsApp community (WhatsApp has no API to auto-post there).
 * Reuses the exact reel the email broadcast attaches.
 */
export async function GET() {
  const userId = await getSignedInUserId();
  if (!isMaintainer(userId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const payload = await loadTodaysVotdPayload();
  if (!payload) {
    return NextResponse.json({ error: "Verse unavailable" }, { status: 500 });
  }

  const { attachments } = await withVotdAttachments(payload);
  const reel = attachments.find((file) => file.filename.endsWith(".mp4"));
  if (!reel) {
    return NextResponse.json(
      { error: "Reel unavailable today (recitation missing or encode failed)" },
      { status: 503 }
    );
  }

  return new NextResponse(Buffer.from(reel.content, "base64"), {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${reel.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
