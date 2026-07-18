import { NextResponse } from "next/server";
import { getAllMoods } from "@/lib/moods";

export async function GET() {
  return NextResponse.json(getAllMoods());
}
