/**
 * Public invite links for the community screen. The values are already shown
 * on the website; this parser is what the app fetches so a new invite does
 * not need another store build.
 */

export type CommunityLinks = {
  whatsapp: string | null;
  telegram: string | null;
};

function httpsUrl(raw: string | undefined, hosts: ReadonlySet<string>): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (!hosts.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const WHATSAPP_HOSTS = new Set(["chat.whatsapp.com"]);
const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me"]);

export function communityLinksFromEnv(
  env: Record<string, string | undefined>
): CommunityLinks {
  return {
    whatsapp: httpsUrl(env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL, WHATSAPP_HOSTS),
    telegram: httpsUrl(env.NEXT_PUBLIC_TELEGRAM_URL, TELEGRAM_HOSTS),
  };
}
