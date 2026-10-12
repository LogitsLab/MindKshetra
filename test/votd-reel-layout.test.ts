import { describe, expect, it } from "vitest";
import slokas from "../data/slokas.json";
import {
  applyAttachmentNote,
  attachmentNote,
  reelFilename,
  reelTimeline,
  sanskritLines,
} from "@/lib/votd-reel-layout";

const VERSE_5_25 =
  "लभन्ते ब्रह्मनिर्वाणमृषयः क्षीणकल्मषाः। छिन्नद्वैधा यतात्मानः सर्वभूतहिते रताः।।5.25।।";

describe("sanskritLines", () => {
  it("sets 5.25 as the two lines from the approved reel", () => {
    expect(sanskritLines(VERSE_5_25)).toEqual([
      "लभन्ते ब्रह्मनिर्वाणमृषयः क्षीणकल्मषाः।",
      "छिन्नद्वैधा यतात्मानः सर्वभूतहिते रताः॥",
    ]);
  });

  it("keeps the verse number off every shloka", () => {
    for (const sloka of slokas) {
      const lines = sanskritLines(sloka.sanskrit_devanagari);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.length).toBeLessThanOrEqual(2);
      expect(lines.at(-1)?.endsWith("॥")).toBe(true);
      for (const line of lines) {
        expect(line).not.toMatch(/\d/);
      }
    }
  });
});

describe("reelTimeline", () => {
  it("holds the verse card for the recitation and fades as the approved reel did", () => {
    const timeline = reelTimeline(28.055);
    expect(timeline.intro).toBe(2.8);
    expect(timeline.verse).toBe(28.055);
    expect(timeline.offset1).toBeCloseTo(2.3, 5);
    expect(timeline.offset2).toBeCloseTo(29.855, 5);
    expect(timeline.audioDelay).toBe(2.4);
    expect(timeline.fadeOut).toBeCloseTo(29.155, 5);
    expect(timeline.offset2).toBeLessThan(
      timeline.intro + timeline.verse - timeline.xfade
    );
  });

  it("caps a runaway recording so the mail stays a short reel", () => {
    expect(reelTimeline(600).verse).toBe(90);
    expect(reelTimeline(1).verse).toBe(8);
  });
});

describe("email attachments", () => {
  it("uses one filename so each day replaces the previous reel", () => {
    expect(reelFilename()).toBe("verse-of-day.mp4");
  });

  it("tells the reader the reel is attached", () => {
    expect(attachmentNote(true)).toBe("Today’s reel is attached.");
    expect(attachmentNote(false)).toBe("");
  });

  it("places the sentence above the account footer", () => {
    const html =
      '<p>Verse</p><!-- votd-attachments --><p style="margin-top: 24px;">Account</p>';
    const next = applyAttachmentNote(html, "Verse", "Today’s reel is attached.");
    expect(next.html).toContain("Today’s reel");
    expect(next.html.indexOf("Today’s reel")).toBeLessThan(
      next.html.indexOf("Account")
    );
    expect(next.html).not.toContain("<!-- votd-attachments -->");
    expect(next.text).toMatch(/attached\.$/);
  });
});
