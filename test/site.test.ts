import { afterEach, describe, expect, it } from "vitest";
import {
  absoluteUrl,
  BRAND_ORIGIN,
  configuredSiteOrigin,
  DEV_ORIGIN,
  isProductionHost,
  LEGACY_ORIGIN,
  PRODUCTION_ORIGIN,
} from "@/lib/site";

describe("site origins", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  });

  it("treats both production hosts (and www) as production", () => {
    expect(isProductionHost("mind.logitslab.com")).toBe(true);
    expect(isProductionHost("mindkshetra.in")).toBe(true);
    expect(isProductionHost("www.mindkshetra.in")).toBe(true);
    expect(isProductionHost("MindKshetra.in")).toBe(true);
    expect(isProductionHost("mind-dev.logitslab.com")).toBe(false);
    expect(isProductionHost("mindkshetra.vercel.app")).toBe(false);
    expect(isProductionHost("localhost")).toBe(false);
  });

  it("falls back to the brand domain as the canonical origin", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(configuredSiteOrigin()).toBe(PRODUCTION_ORIGIN);
    expect(PRODUCTION_ORIGIN).toBe("https://mindkshetra.in");
    expect(BRAND_ORIGIN).toBe(PRODUCTION_ORIGIN);
    expect(LEGACY_ORIGIN).toBe("https://mind.logitslab.com");
    expect(DEV_ORIGIN).toBe("https://mind-dev.logitslab.com");
  });

  it("uses NEXT_PUBLIC_SITE_URL when it is a real non-local origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://mindkshetra.in/";
    expect(configuredSiteOrigin()).toBe("https://mindkshetra.in");
    process.env.NEXT_PUBLIC_SITE_URL = DEV_ORIGIN;
    expect(configuredSiteOrigin()).toBe(DEV_ORIGIN);
  });

  it("never canonicalises to a legacy host that now redirects", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://mind.logitslab.com";
    expect(configuredSiteOrigin()).toBe(PRODUCTION_ORIGIN);
    process.env.NEXT_PUBLIC_SITE_URL = "https://mindkshetra.vercel.app/";
    expect(configuredSiteOrigin()).toBe(PRODUCTION_ORIGIN);
  });

  it("ignores local and redacted SITE_URL values", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    expect(configuredSiteOrigin()).toBe(PRODUCTION_ORIGIN);
    process.env.NEXT_PUBLIC_SITE_URL = "[SENSITIVE]";
    expect(configuredSiteOrigin()).toBe(PRODUCTION_ORIGIN);
  });

  it("builds absolute URLs on the canonical origin", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(absoluteUrl()).toBe("https://mindkshetra.in");
    expect(absoluteUrl("/sloka/94")).toBe("https://mindkshetra.in/sloka/94");
    expect(absoluteUrl("explore")).toBe("https://mindkshetra.in/explore");
  });
});
