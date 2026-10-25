import { describe, it, expect } from "vitest";
import { looksDegenerate } from "@/lib/groq";

/**
 * Guards the qwen repetition-loop failure mode observed on the Hindi story
 * pass (a short phrase repeated dozens of times). A story flagged here is
 * rejected and regenerated in completeStory rather than saved/shown.
 */
describe("looksDegenerate", () => {
  it("flags a repeated-phrase loop", () => {
    const looped = Array(40).fill("बल्कि उन्नीस नहीं").join(" ");
    expect(looksDegenerate(looped)).toBe(true);
  });

  it("flags an English runaway loop", () => {
    const looped = `It will dry. ${"the stain will not ".repeat(30)}`;
    expect(looksDegenerate(looped)).toBe(true);
  });

  it("passes normal prose with only incidental repetition", () => {
    const clean =
      "The kitchen light hums at midnight while Meera wipes the counter and " +
      "watches the rain streak the window. Her father reads a newspaper he has " +
      "not turned in minutes. The brown stain is drying on the white tile as she " +
      "lets her hand drop and leaves the cloth where it is. Plip. Plip. Plip.";
    expect(looksDegenerate(clean)).toBe(false);
  });

  it("ignores short strings", () => {
    expect(looksDegenerate("too short to judge")).toBe(false);
  });
});
