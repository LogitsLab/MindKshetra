import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  makeUnsubscribeToken,
  UnsubscribeConfigError,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from "@/lib/notifications/unsubscribe";

const USER_ID = "8b7c3a52-1f0e-4b6d-9a3c-2d5e7f8a9b0c";

describe("unsubscribe tokens", () => {
  beforeEach(() => {
    process.env.UNSUB_SECRET = "test-secret-for-unsubscribe-tokens";
  });
  afterEach(() => {
    delete process.env.UNSUB_SECRET;
  });

  it("round-trips: verify(make(userId)) returns the userId", () => {
    const token = makeUnsubscribeToken(USER_ID);
    expect(verifyUnsubscribeToken(token)).toBe(USER_ID);
  });

  it("has the {userId}.{hex hmac} shape", () => {
    const token = makeUnsubscribeToken(USER_ID);
    expect(token).toMatch(
      /^[0-9a-f-]{36}\.[0-9a-f]{64}$/i
    );
    expect(token.startsWith(`${USER_ID}.`)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const token = makeUnsubscribeToken(USER_ID);
    const flipped =
      token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(verifyUnsubscribeToken(flipped)).toBeNull();
  });

  it("rejects a token whose userId was swapped", () => {
    const token = makeUnsubscribeToken(USER_ID);
    const signature = token.split(".")[1];
    const other = "11111111-2222-4333-8444-555555555555";
    expect(verifyUnsubscribeToken(`${other}.${signature}`)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifyUnsubscribeToken("")).toBeNull();
    expect(verifyUnsubscribeToken(null)).toBeNull();
    expect(verifyUnsubscribeToken(undefined)).toBeNull();
    expect(verifyUnsubscribeToken("no-dot-here")).toBeNull();
    expect(verifyUnsubscribeToken(`${USER_ID}.deadbeef`)).toBeNull();
    expect(verifyUnsubscribeToken(`not-a-uuid.${"a".repeat(64)}`)).toBeNull();
    expect(verifyUnsubscribeToken("x".repeat(500))).toBeNull();
  });

  it("rejects tokens minted under a different secret", () => {
    const token = makeUnsubscribeToken(USER_ID);
    process.env.UNSUB_SECRET = "another-secret-entirely";
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it("throws UnsubscribeConfigError when UNSUB_SECRET is unset", () => {
    delete process.env.UNSUB_SECRET;
    expect(() => makeUnsubscribeToken(USER_ID)).toThrow(
      UnsubscribeConfigError
    );
    expect(() =>
      verifyUnsubscribeToken(`${USER_ID}.${"a".repeat(64)}`)
    ).toThrow(UnsubscribeConfigError);
  });

  it("builds an absolute one-click URL with an encoded token", () => {
    const url = unsubscribeUrl(USER_ID, "https://mind.logitslab.com/");
    expect(url.startsWith("https://mind.logitslab.com/api/unsubscribe?token="))
      .toBe(true);
    const token = decodeURIComponent(url.split("token=")[1]);
    expect(verifyUnsubscribeToken(token)).toBe(USER_ID);
  });
});
