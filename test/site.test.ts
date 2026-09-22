import { afterEach, describe, expect, it } from "vitest";
import {
  BRAND_ORIGIN,
  configuredSiteOrigin,
  DEV_ORIGIN,
  isProductionHost,
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
    expect(isProductionHost("localhost")).toBe(false);
  });

  it("keeps the logitslab host as the fallback canonical origin", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(configuredSiteOrigin()).toBe(PRODUCTION_ORIGIN);
    expect(BRAND_ORIGIN).toBe("https://mindkshetra.in");
    expect(DEV_ORIGIN).toBe("https://mind-dev.logitslab.com");
  });

  it("uses NEXT_PUBLIC_SITE_URL when it is a real non-local origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://mindkshetra.in/";
    expect(configuredSiteOrigin()).toBe("https://mindkshetra.in");
  });

  it("ignores local and redacted SITE_URL values", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    expect(configuredSiteOrigin()).toBe(PRODUCTION_ORIGIN);
    process.env.NEXT_PUBLIC_SITE_URL = "[SENSITIVE]";
    expect(configuredSiteOrigin()).toBe(PRODUCTION_ORIGIN);
  });
});
