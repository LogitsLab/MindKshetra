import { NextResponse } from "next/server";
import { isDbContentEnabled } from "@/lib/content/source";
import { pingDatabase } from "@/lib/supabase/admin";
import { redisEnabled, redisPing, redisMissingOnVercel } from "@/lib/redis";

export async function GET() {
  const enabled = redisEnabled();
  const ping = enabled ? await redisPing() : false;
  const dbConfigured = isDbContentEnabled();
  const dbReachable = dbConfigured ? await pingDatabase() : false;

  return NextResponse.json({
    ok: true,
    contentSource: dbConfigured ? "db" : "json",
    redis: {
      configured: enabled,
      reachable: ping,
      missingOnVercel: redisMissingOnVercel(),
    },
    database: {
      configured: dbConfigured,
      reachable: dbReachable,
    },
  });
}
