/**
 * Public invite links for the community screen. The values are already shown
 * on the website; this parser is what the app fetches so a new invite does
 * not need another store build.
 *
 * WhatsApp Channels live on whatsapp.com/channel/…; classic community invites
 * live on chat.whatsapp.com. Both are accepted.
 */

import {
  INSTAGRAM_URL,
  WHATSAPP_CHANNEL_FALLBACK,
  resolveWhatsAppChannelUrl,
} from "@/lib/brand-links";

export type CommunityLinks = {
  whatsapp: string | null;
  telegram: string | null;
  instagram: string | null;
  website: string | null;
};

function httpsUrl(
  raw: string | undefined,
  hosts: ReadonlySet<string>,
  pathPrefix?: string
): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (!hosts.has(host)) return null;
    if (pathPrefix && !url.pathname.startsWith(pathPrefix)) {
      // chat.whatsapp.com invites have no /channel prefix; whatsapp.com must.
      if (host === "whatsapp.com" || host === "www.whatsapp.com") return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

const WHATSAPP_HOSTS = new Set([
  "chat.whatsapp.com",
  "whatsapp.com",
  "www.whatsapp.com",
]);
const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me"]);
const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);

function whatsappFromEnv(env: Record<string, string | undefined>): string | null {
  const raw = env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL?.trim();
  if (!raw) return null;
  // Channel URLs on whatsapp.com must use /channel/
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (!WHATSAPP_HOSTS.has(host)) return null;
    if (
      (host === "whatsapp.com" || host === "www.whatsapp.com") &&
      !url.pathname.startsWith("/channel/")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function communityLinksFromEnv(
  env: Record<string, string | undefined>
): CommunityLinks {
  const whatsapp =
    whatsappFromEnv(env) ??
    // Prefer explicit fallback so mobile never shows "channels soon" in prod.
    (env.NODE_ENV === "test" ? null : WHATSAPP_CHANNEL_FALLBACK);

  const websiteRaw = env.NEXT_PUBLIC_SITE_URL?.trim();
  let website: string | null = "https://mindkshetra.in";
  if (websiteRaw) {
    try {
      const u = new URL(websiteRaw);
      if (u.protocol === "https:") website = u.origin;
    } catch {
      /* keep default */
    }
  }

  return {
    whatsapp,
    telegram: httpsUrl(env.NEXT_PUBLIC_TELEGRAM_URL, TELEGRAM_HOSTS),
    instagram:
      httpsUrl(env.NEXT_PUBLIC_INSTAGRAM_URL, INSTAGRAM_HOSTS) ?? INSTAGRAM_URL,
    website,
  };
}

/** Server helper when reading process.env directly. */
export function liveCommunityLinks(): CommunityLinks {
  return communityLinksFromEnv({
    ...process.env,
    NEXT_PUBLIC_WHATSAPP_CHANNEL_URL: resolveWhatsAppChannelUrl(process.env),
  });
}
