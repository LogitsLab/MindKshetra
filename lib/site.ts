/**
 * Public hosts. `NEXT_PUBLIC_SITE_URL` is the canonical origin for sitemap,
 * Open Graph, and email links. Both production hosts serve the same
 * deployment; switch the env var when the brand domain should become canonical.
 *
 * Dev stays on mind-dev.logitslab.com (preview alias). Do not add the brand
 * domain to preview.
 */

export const PRODUCTION_ORIGIN = "https://mind.logitslab.com";
export const BRAND_ORIGIN = "https://mindkshetra.in";
export const DEV_ORIGIN = "https://mind-dev.logitslab.com";

export const PRODUCTION_HOSTS = [
  "mind.logitslab.com",
  "mindkshetra.in",
  "www.mindkshetra.in",
] as const;

const LOCAL_HOST = /localhost|127\.0\.0\.1/;

export function isProductionHost(hostname: string): boolean {
  return (PRODUCTION_HOSTS as readonly string[]).includes(
    hostname.trim().toLowerCase()
  );
}

/** Canonical public origin: env if it is a real non-local URL, else the logitslab host. */
export function configuredSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  if (
    configured &&
    configured !== "[SENSITIVE]" &&
    !LOCAL_HOST.test(configured)
  ) {
    return configured;
  }
  return PRODUCTION_ORIGIN;
}
