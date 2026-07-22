import { NextResponse } from "next/server";
import { healthSunLongitude } from "@/lib/astrology/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = healthSunLongitude();
    return NextResponse.json({
      sweph: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sweph failed";
    console.error("[astrology/health]", message);
    return NextResponse.json(
      { ok: false, sweph: false, error: message },
      { status: 500 }
    );
  }
}
