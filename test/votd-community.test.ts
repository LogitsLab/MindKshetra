import { describe, expect, it } from "vitest";
import {
  votdCommunityCaption,
  votdReelObjectPath,
  votdReelPublicUrl,
} from "@/lib/votd-community";

describe("votd community reel", () => {
  it("stores one file per IST day under the public audio bucket", () => {
    expect(votdReelObjectPath("2026-10-27")).toBe(
      "votd/2026-10-27/verse-of-day.mp4"
    );
    expect(() => votdReelObjectPath("../etc")).toThrow(/YYYY-MM-DD/);
  });

  it("builds a caption a morning post can paste", () => {
    expect(
      votdCommunityCaption({
        ref: "2.47",
        english: "You have a right to action, never to its fruits.",
        verseUrl: "https://mind.logitslab.com/sloka/82",
      })
    ).toBe(
      "2.47\nYou have a right to action, never to its fruits.\nhttps://mind.logitslab.com/sloka/82"
    );
  });

  it("builds the public reel URL from the audio base", () => {
    const prev = process.env.NEXT_PUBLIC_AUDIO_BASE_URL;
    process.env.NEXT_PUBLIC_AUDIO_BASE_URL = "https://cdn.example.com/audio";
    expect(votdReelPublicUrl("2026-10-27")).toBe(
      "https://cdn.example.com/audio/votd/2026-10-27/verse-of-day.mp4"
    );
    expect(votdReelPublicUrl("../etc")).toBeNull();
    if (prev === undefined) delete process.env.NEXT_PUBLIC_AUDIO_BASE_URL;
    else process.env.NEXT_PUBLIC_AUDIO_BASE_URL = prev;
  });

  it("keeps a long English line inside a WhatsApp caption", () => {
    const caption = votdCommunityCaption({
      ref: "18.66",
      english: "word ".repeat(400),
      verseUrl: "https://mind.logitslab.com/sloka/700",
    });
    expect(caption.length).toBeLessThanOrEqual(1024);
    expect(caption.startsWith("18.66\n")).toBe(true);
  });
});
