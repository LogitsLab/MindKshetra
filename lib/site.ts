/**
 * Public hosts. The brand domain is the canonical origin for every canonical
 * tag, sitemap entry, Open Graph URL, JSON-LD id and email link.
 *
 * mind.logitslab.com stays attached to the production project, but page
 * traffic on it 308s to the brand domain (next.config.mjs). `/api/` and
 * `/auth/` are exempt: the mobile app's API base and in-flight OAuth returns
 * still use the logitslab host.
 *
 * Dev stays on mind-dev.logitslab.com (preview alias) and is noindexed by
 * middleware. Do not add the brand domain to preview.
 */

export const PRODUCTION_ORIGIN = "https://mindkshetra.in";
/** @deprecated Same value as PRODUCTION_ORIGIN; kept for existing imports. */
export const BRAND_ORIGIN = PRODUCTION_ORIGIN;
export const LEGACY_ORIGIN = "https://mind.logitslab.com";
export const DEV_ORIGIN = "https://mind-dev.logitslab.com";

export const APP_STORE_URL = "https://apps.apple.com/app/id6795863564";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.mindkshetra.mobile";

export const PRODUCTION_HOSTS = [
  "mindkshetra.in",
  "www.mindkshetra.in",
  "mind.logitslab.com",
] as const;

/**
 * Hosts that serve the production deployment but must never be canonical.
 * Their page paths redirect to PRODUCTION_ORIGIN.
 */
export const LEGACY_HOSTS = ["mind.logitslab.com", "mindkshetra.vercel.app"] as const;

const LOCAL_HOST = /localhost|127\.0\.0\.1/;

export function isProductionHost(hostname: string): boolean {
  return (PRODUCTION_HOSTS as readonly string[]).includes(
    hostname.trim().toLowerCase()
  );
}

function isLegacyOrigin(origin: string): boolean {
  try {
    return (LEGACY_HOSTS as readonly string[]).includes(
      new URL(origin).hostname.toLowerCase()
    );
  } catch {
    return false;
  }
}

/**
 * Canonical public origin: `NEXT_PUBLIC_SITE_URL` when it is a real,
 * non-local, non-legacy URL (dev sets its own host); otherwise the brand
 * domain. A production env still pointing at mind.logitslab.com would
 * canonicalise every page to a URL that now redirects, so the legacy host is
 * treated as unset rather than trusted.
 */
export function configuredSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  if (
    configured &&
    configured !== "[SENSITIVE]" &&
    !LOCAL_HOST.test(configured) &&
    !isLegacyOrigin(configured)
  ) {
    return configured;
  }
  return PRODUCTION_ORIGIN;
}

/** Absolute URL on the canonical origin for a site path ("/sloka/94"). */
export function absoluteUrl(path = "/"): string {
  const origin = configuredSiteOrigin();
  if (!path || path === "/") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
