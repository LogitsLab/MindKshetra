/**
 * Public brand destinations shown in Community, Account, footer and the
 * mobile Links block. Channel + Instagram are product constants; WhatsApp
 * still prefers the env so a link rotation is a web deploy for the app.
 */

import { PRODUCTION_ORIGIN, APP_STORE_URL, PLAY_STORE_URL } from "@/lib/site";

export const SUPPORT_EMAIL = "info@logitslab.com";

export const INSTAGRAM_URL = "https://www.instagram.com/mindkshetra_/";
export const INSTAGRAM_HANDLE = "@mindkshetra_";

/** Fallback when env is unset (production Channel). */
export const WHATSAPP_CHANNEL_FALLBACK =
  "https://whatsapp.com/channel/0029Vb9JeuR1HspuQB3jn61u";

export type BrandLink = {
  id: "website" | "privacy" | "support" | "whatsapp" | "instagram" | "email" | "appStore" | "playStore";
  labelEn: string;
  labelHi: string;
  href: string;
  external?: boolean;
};

export function brandWebsiteOrigin(): string {
  return PRODUCTION_ORIGIN;
}

export function resolveWhatsAppChannelUrl(
  env: Record<string, string | undefined> = process.env
): string {
  const raw = env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL?.trim();
  return raw && raw.length > 0 ? raw : WHATSAPP_CHANNEL_FALLBACK;
}

/** Ordered links for Follow us / Links panels. */
export function brandLinks(opts?: {
  whatsapp?: string | null;
  includeStores?: boolean;
}): BrandLink[] {
  const origin = brandWebsiteOrigin();
  const whatsapp = opts?.whatsapp ?? resolveWhatsAppChannelUrl();
  const links: BrandLink[] = [
    {
      id: "website",
      labelEn: "Website",
      labelHi: "वेबसाइट",
      href: origin,
      external: true,
    },
    {
      id: "whatsapp",
      labelEn: "WhatsApp Channel",
      labelHi: "व्हाट्सऐप चैनल",
      href: whatsapp,
      external: true,
    },
    {
      id: "instagram",
      labelEn: `Instagram ${INSTAGRAM_HANDLE}`,
      labelHi: `इंस्टाग्राम ${INSTAGRAM_HANDLE}`,
      href: INSTAGRAM_URL,
      external: true,
    },
    {
      id: "support",
      labelEn: "Support",
      labelHi: "सहयोग",
      href: `${origin}/support`,
      external: true,
    },
    {
      id: "privacy",
      labelEn: "Privacy",
      labelHi: "गोपनीयता",
      href: `${origin}/privacy`,
      external: true,
    },
    {
      id: "email",
      labelEn: SUPPORT_EMAIL,
      labelHi: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL}`,
      external: true,
    },
  ];
  if (opts?.includeStores) {
    links.push(
      {
        id: "appStore",
        labelEn: "App Store",
        labelHi: "App Store",
        href: APP_STORE_URL,
        external: true,
      },
      {
        id: "playStore",
        labelEn: "Google Play",
        labelHi: "Google Play",
        href: PLAY_STORE_URL,
        external: true,
      }
    );
  }
  return links;
}
