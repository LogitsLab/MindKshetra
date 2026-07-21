import { NextResponse } from "next/server";
import { redisEnabled, redisPing, redisMissingOnVercel } from "@/lib/redis";

/** Lightweight ops check — Redis status for production wiring. */
export async function GET() {
  const enabled = redisEnabled();
  const ping = enabled ? await redisPing() : false;

  return NextResponse.json({
    ok: true,
    redis: {
      configured: enabled,
      reachable: ping,
      missingOnVercel: redisMissingOnVercel(),
    },
  });
}
