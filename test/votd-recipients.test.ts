import { describe, expect, it } from "vitest";
import { isVotdBroadcastRecipient } from "@/lib/votd-recipients";

describe("isVotdBroadcastRecipient", () => {
  it("keeps a real subscriber", () => {
    expect(isVotdBroadcastRecipient("reader@gmail.com")).toBe(true);
    expect(isVotdBroadcastRecipient("saksham@logitslab.com")).toBe(true);
  });

  it("skips the automated QA accounts", () => {
    expect(isVotdBroadcastRecipient("qa.phase3.1786012641@logitslab.com")).toBe(
      false
    );
    expect(isVotdBroadcastRecipient("QA.Bearer.1@logitslab.com")).toBe(false);
  });

  it("rejects an address with no domain", () => {
    expect(isVotdBroadcastRecipient("not-an-email")).toBe(false);
  });
});
