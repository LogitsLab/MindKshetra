import { describe, it, expect } from "vitest";
import { dictionary } from "@/lib/i18n/dictionary";

/**
 * i18n completeness guard.
 *
 * The composed `hi` dictionary is typed `Record<keyof typeof en, string>`, so
 * TypeScript already catches a missing Hindi KEY. It does NOT catch an empty
 * Hindi VALUE — that is exactly how `homeLifestyleBlurb: ""` shipped blank on
 * the home screen. These runtime checks fail loudly on empties and on any
 * en/hi key drift, so a future blank string can never slip through again.
 */
describe("i18n dictionary parity", () => {
  const enKeys = Object.keys(dictionary.en).sort();
  const hiKeys = Object.keys(dictionary.hi).sort();

  it("has the same keys in en and hi", () => {
    const missingInHi = enKeys.filter((k) => !(k in dictionary.hi));
    const extraInHi = hiKeys.filter((k) => !(k in dictionary.en));
    expect({ missingInHi, extraInHi }).toEqual({
      missingInHi: [],
      extraInHi: [],
    });
  });

  it("has no empty English strings", () => {
    const empty = enKeys.filter(
      (k) => !String(dictionary.en[k as keyof typeof dictionary.en]).trim()
    );
    expect(empty).toEqual([]);
  });

  it("has no empty Hindi strings", () => {
    const empty = hiKeys.filter(
      (k) => !String(dictionary.hi[k as keyof typeof dictionary.hi]).trim()
    );
    expect(empty).toEqual([]);
  });
});
