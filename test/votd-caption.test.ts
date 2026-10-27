import { describe, it, expect } from "vitest";
import { buildVotdCaption } from "@/lib/votd-caption";

describe("buildVotdCaption", () => {
  const base = { ref: "2.47", site: "https://mindkshetra.in" };

  it("includes the verse ref and site link", () => {
    const c = buildVotdCaption(base);
    expect(c).toContain("2.47");
    expect(c).toContain("https://mindkshetra.in");
  });

  it("appends the WhatsApp invite line when a url is given", () => {
    const c = buildVotdCaption(base, {
      whatsappUrl: "https://chat.whatsapp.com/G7KhZGaJC1fII4t2osTl7v",
    });
    expect(c).toContain("https://chat.whatsapp.com/G7KhZGaJC1fII4t2osTl7v");
    expect(c).toContain("Invite someone");
  });

  it("omits the invite line when no url is given", () => {
    expect(buildVotdCaption(base)).not.toContain("Invite someone");
    expect(buildVotdCaption(base, { whatsappUrl: null })).not.toContain(
      "Invite someone"
    );
  });
});
