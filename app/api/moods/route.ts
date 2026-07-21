import { NextResponse } from "next/server";
import { getAllMoods } from "@/lib/moods";

export async function GET() {
  const moods = await getAllMoods();
  return NextResponse.json(moods, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
