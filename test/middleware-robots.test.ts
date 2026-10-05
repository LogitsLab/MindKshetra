import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

/**
 * Non-production hosts (mind-dev, preview URLs, the vercel.app alias) must be
 * noindexed; production must never be. The check reads the Host header, not
 * nextUrl.hostname — a wrong answer here deindexes the live site.
 */
async function robotsFor(url: string, headers: Record<string, string>) {
  const res = await middleware(new NextRequest(url, { headers }));
  return res.headers.get("x-robots-tag");
}

describe("middleware robots header", () => {
  it("leaves production hosts indexable", async () => {
    expect(await robotsFor("http://localhost:3000/sloka/94", { host: "mindkshetra.in" })).toBeNull();
    expect(
      await robotsFor("http://localhost:3000/", { "x-forwarded-host": "mindkshetra.in", host: "localhost:3000" })
    ).toBeNull();
    expect(await robotsFor("https://mind.logitslab.com/api/health", { host: "mind.logitslab.com" })).toBeNull();
  });

  it("noindexes dev, preview and local hosts", async () => {
    for (const host of [
      "mind-dev.logitslab.com",
      "mindkshetra-abc123-team.vercel.app",
      "mindkshetra.vercel.app",
      "localhost:3000",
    ]) {
      expect(await robotsFor(`https://${host}/sloka/94`, { host }), host).toBe("noindex, nofollow");
    }
  });
});
