import { describe, expect, it } from "vitest";
import { communityLinksFromEnv } from "@/lib/community-links";
import { INSTAGRAM_URL, WHATSAPP_CHANNEL_FALLBACK } from "@/lib/brand-links";

describe("communityLinksFromEnv", () => {
  it("returns a WhatsApp community invite and a Telegram link", () => {
    expect(
      communityLinksFromEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_WHATSAPP_CHANNEL_URL:
          "https://chat.whatsapp.com/AbCdEf123",
        NEXT_PUBLIC_TELEGRAM_URL: "https://t.me/mindkshetra",
      })
    ).toMatchObject({
      whatsapp: "https://chat.whatsapp.com/AbCdEf123",
      telegram: "https://t.me/mindkshetra",
      instagram: INSTAGRAM_URL,
    });
  });

  it("accepts WhatsApp Channel URLs on whatsapp.com", () => {
    expect(
      communityLinksFromEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_WHATSAPP_CHANNEL_URL:
          "https://whatsapp.com/channel/0029Vb9JeuR1HspuQB3jn61u",
      }).whatsapp
    ).toBe("https://whatsapp.com/channel/0029Vb9JeuR1HspuQB3jn61u");
  });

  it("rejects whatsapp.com URLs that are not channels", () => {
    expect(
      communityLinksFromEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_WHATSAPP_CHANNEL_URL: "https://whatsapp.com/dl",
      }).whatsapp
    ).toBeNull();
  });

  it("hides missing, non-https, and off-host links in test", () => {
    expect(
      communityLinksFromEnv({
        NODE_ENV: "test",
        NEXT_PUBLIC_WHATSAPP_CHANNEL_URL: "http://chat.whatsapp.com/AbC",
        NEXT_PUBLIC_TELEGRAM_URL: "https://example.com/not-telegram",
      })
    ).toMatchObject({ whatsapp: null, telegram: null });
    expect(communityLinksFromEnv({ NODE_ENV: "test" })).toMatchObject({
      whatsapp: null,
      telegram: null,
      instagram: INSTAGRAM_URL,
    });
  });

  it("falls back to the production Channel outside test", () => {
    expect(communityLinksFromEnv({}).whatsapp).toBe(WHATSAPP_CHANNEL_FALLBACK);
  });
});
