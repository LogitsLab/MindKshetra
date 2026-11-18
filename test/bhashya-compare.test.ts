import { describe, expect, it } from "vitest";
import {
  bhashyaCompareFor,
  hasBhashyaCompare,
} from "@/lib/bhashya-compare";

describe("bhashya-compare", () => {
  it("returns dual voices for flagship 2.47", () => {
    const voices = bhashyaCompareFor(2, 47, "en");
    expect(voices).toHaveLength(2);
    expect(voices?.[0]?.id).toBe("sivananda");
    expect(voices?.[1]?.id).toBe("prabhupada");
  });

  it("returns Hindi voices for 18.66", () => {
    const voices = bhashyaCompareFor(18, 66, "hi");
    expect(voices?.length).toBeGreaterThanOrEqual(2);
    expect(hasBhashyaCompare(18, 66)).toBe(true);
  });

  it("returns null for verses without curated compare", () => {
    expect(bhashyaCompareFor(1, 1, "en")).toBeNull();
    expect(hasBhashyaCompare(1, 1)).toBe(false);
  });
});
