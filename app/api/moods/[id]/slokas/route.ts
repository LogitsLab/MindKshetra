import { NextRequest, NextResponse } from "next/server";
import { getMoodById } from "@/lib/moods";
import { getSlokasByTags } from "@/lib/slokas";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const mood = await getMoodById(params.id);
  if (!mood) {
    return NextResponse.json({ error: "Mood not found" }, { status: 404 });
  }

  const slokas = (await getSlokasByTags(mood.tags)).slice(0, 40);
  return NextResponse.json({ mood, slokas }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
