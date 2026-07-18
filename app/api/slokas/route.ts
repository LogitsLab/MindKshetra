import { NextRequest, NextResponse } from "next/server";
import {
  getAllSlokas,
  getSlokasByChapter,
  searchSlokas,
} from "@/lib/slokas";

export async function GET(request: NextRequest) {
  const chapterParam = request.nextUrl.searchParams.get("chapter");
  const q = request.nextUrl.searchParams.get("q");

  if (q?.trim()) {
    return NextResponse.json(searchSlokas(q, 40));
  }

  if (chapterParam) {
    const chapter = Number(chapterParam);
    if (!Number.isInteger(chapter) || chapter < 1) {
      return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
    }
    return NextResponse.json(getSlokasByChapter(chapter));
  }

  return NextResponse.json(getAllSlokas());
}
