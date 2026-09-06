import { describe, it, expect } from "vitest";
import { hasJapaChant, JAPA_CHANT_IDS } from "@/lib/audio/japaChants";

describe("japa chant catalog", () => {
  it("covers the isolated Commons / Jamendo recitations", () => {
    expect([...JAPA_CHANT_IDS]).toEqual([
      "om",
      "om-namo-bhagavate-vasudevaya",
      "hare-krishna",
      "so-ham",
      "om-namah-shivaya",
      "gayatri",
      "mahamrityunjaya",
    ]);
  });

  it("never claims a file for custom naam or mantras without a CC clip", () => {
    expect(hasJapaChant("custom")).toBe(false);
    expect(hasJapaChant("om-gam-ganapataye")).toBe(false);
    expect(hasJapaChant("sri-ram")).toBe(false);
    expect(hasJapaChant("om-shanti")).toBe(false);
  });
});
