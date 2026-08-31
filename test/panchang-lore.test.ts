import { describe, it, expect } from "vitest";
import { loreForPanchang, pickBlurb } from "@/lib/panchang-lore";

describe("panchang lore", () => {
  it("returns tithi, nakshatra, vaar, and ekadashi specials", () => {
    const lore = loreForPanchang({
      tithiIndex: 10,
      nakshatra: "Rohini",
      vaar: "Thursday",
      isEkadashi: true,
      isPurnima: false,
      isAmavasya: false,
    });
    expect(lore.tithi?.en).toMatch(/Ekadashi/i);
    expect(lore.nakshatra?.en).toMatch(/Rohini/i);
    expect(lore.vaar?.en).toMatch(/Thursday|Jupiter/i);
    expect(lore.special?.en).toMatch(/Ekadashi/i);
    expect(pickBlurb(lore.special, "hi").length).toBeGreaterThan(10);
  });

  it("uses amavasya special on tithi index 29", () => {
    const lore = loreForPanchang({
      tithiIndex: 29,
      nakshatra: "Revati",
      vaar: "Saturday",
      isEkadashi: false,
      isPurnima: false,
      isAmavasya: true,
    });
    expect(lore.tithi?.en).toMatch(/Amavasya/i);
    expect(lore.special?.en).toMatch(/Amavasya|new moon/i);
  });
});
