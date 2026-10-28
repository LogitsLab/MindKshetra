import { describe, expect, it } from "vitest";
import { communityLinksFromEnv } from "@/lib/community-links";

describe("communityLinksFromEnv", () => {
  it("returns a WhatsApp community invite and a Telegram link", () => {
    expect(
      communityLinksFromEnv({
        NEXT_PUBLIC_WHATSAPP_CHANNEL_URL:
          "https://chat.whatsapp.com/AbCdEf123",
        NEXT_PUBLIC_TELEGRAM_URL: "https://t.me/mindkshetra",
      })
    ).toEqual({
      whatsapp: "https://chat.whatsapp.com/AbCdEf123",
      telegram: "https://t.me/mindkshetra",
    });
  });

  it("hides missing, non-https, and off-host links", () => {
    expect(
      communityLinksFromEnv({
        NEXT_PUBLIC_WHATSAPP_CHANNEL_URL: "http://chat.whatsapp.com/AbC",
        NEXT_PUBLIC_TELEGRAM_URL: "https://example.com/not-telegram",
      })
    ).toEqual({ whatsapp: null, telegram: null });
    expect(communityLinksFromEnv({})).toEqual({
      whatsapp: null,
      telegram: null,
    });
  });
});
