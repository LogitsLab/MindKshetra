import { NextRequest, NextResponse } from "next/server";
import {
  computeAbhijitMuhurat,
  computeDayChoghadiya,
  defaultCivilSun,
} from "@/lib/astrology/muhurat";

/**
 * GET /api/astrology/muhurat?date=YYYY-MM-DD
 * Lifestyle muhurat windows — approximate; informational only.
 * Gated by ASTROLOGY_LIFESTYLE_ENABLED (default on in non-prod for design).
 */
export async function GET(request: NextRequest) {
  if (process.env.ASTROLOGY_LIFESTYLE_ENABLED === "0") {
    return NextResponse.json(
      { error: "Muhurat lifestyle layer disabled", enabled: false },
      { status: 404 }
    );
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  const base = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const { sunrise, sunset } = defaultCivilSun(base);
  const abhijit = computeAbhijitMuhurat(sunrise, sunset);
  const choghadiya = computeDayChoghadiya(sunrise, sunset, base.getDay());

  return NextResponse.json({
    enabled: true,
    date: base.toISOString().slice(0, 10),
    disclaimer:
      "Informational approximations for practice timing — not a classical muhurat ruling.",
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
    muhurats: [abhijit],
    choghadiya,
  });
}
