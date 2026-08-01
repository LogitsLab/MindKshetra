import { NextResponse } from "next/server";
import {
  loadDailySits,
  loadFoundationProgram,
  sessionTranscript,
} from "@/lib/meditation";

export const runtime = "nodejs";
export const dynamic = "force-static";

/** GET /api/meditation/catalog — program + daily sits (public JSON). */
export async function GET() {
  const program = loadFoundationProgram();
  const dailies = loadDailySits();
  if (!program) {
    return NextResponse.json({ error: "Catalog missing" }, { status: 500 });
  }

  const days = program.days.map((d) => ({
    ...d,
    transcript_en: sessionTranscript(d, "en"),
    transcript_hi: sessionTranscript(d, "hi"),
  }));
  const sessions =
    dailies?.sessions.map((s) => ({
      ...s,
      transcript_en: sessionTranscript(s, "en"),
      transcript_hi: sessionTranscript(s, "hi"),
    })) ?? [];

  return NextResponse.json(
    {
      program: { ...program, days },
      dailies: dailies
        ? { ...dailies, sessions }
        : { id: "daily-sits", sessions: [] },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    }
  );
}
