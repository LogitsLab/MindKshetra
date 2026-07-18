import { NextResponse } from "next/server";
import { getMoodById } from "@/lib/moods";
import { getSlokasByTags } from "@/lib/slokas";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const mood = getMoodById(params.id);
  if (!mood) {
    return NextResponse.json({ error: "Mood not found" }, { status: 404 });
  }

  const slokas = getSlokasByTags(mood.tags);
  return NextResponse.json({ mood, slokas });
}
