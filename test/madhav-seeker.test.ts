import { describe, expect, it } from "vitest";
import { buildMadhavSystemPrompt } from "@/lib/groq";
import { formatSeekerPromptBlock, madhavMaxTokens } from "@/lib/madhav/seeker";
import {
  addressName,
  composeMadhavToday,
  fillName,
  type MadhavTodayFacts,
} from "@/lib/madhav/today";
import type { Sloka } from "@/lib/types";

const verse: Sloka = {
  id: 47,
  chapter: 2,
  verse_number: 47,
  sanskrit_devanagari: "कर्मण्येवाधिकारस्ते",
  transliteration_iast: "karmaṇy-evādhikāras te",
  hindi_translation: "कर्म में तुम्हारा अधिकार है",
  english_translation: "You have a right to action alone",
  tags: [],
};

const emptyFacts = (): MadhavTodayFacts => ({
  lang: "en",
  displayName: "",
  votdRef: null,
  doneToday: [],
  festivalLabel: null,
  isEkadashi: false,
  goals: [],
  guidanceStyle: null,
});

describe("addressName", () => {
  it("falls back to Parth when the display name is missing", () => {
    expect(addressName("", "en")).toBe("Parth");
    expect(addressName(null, "hi")).toBe("पार्थ");
    expect(addressName("   ", "en")).toBe("Parth");
  });

  it("keeps a trimmed display name", () => {
    expect(addressName("  Saksham  ", "en")).toBe("Saksham");
  });
});

describe("formatSeekerPromptBlock", () => {
  it("still addresses Parth when prefs are missing", () => {
    const block = formatSeekerPromptBlock(null, "en");
    expect(block).toContain("The seeker's name is Parth");
    expect(block).not.toContain("They came for:");
    expect(block).not.toContain("practice-first");
  });

  it("injects world name, goals, minutes, and practice-first shape", () => {
    const block = formatSeekerPromptBlock(
      {
        displayName: "Saksham",
        goals: ["inner_peace", "stress_relief"],
        guidanceStyle: "practice_first",
        dailyTimeMinutes: 10,
      },
      "en"
    );
    expect(block).toContain("name in the world is Saksham");
    expect(block).toContain("Parth (पार्थ)");
    expect(block).toContain("Inner Peace, Stress Relief");
    expect(block).toContain("about 10 minutes");
    expect(block).toContain("practice-first");
    expect(block).toContain("well under 180 words");
    expect(block).toMatch(/10-minute practice/);
  });
});

describe("buildMadhavSystemPrompt", () => {
  it("does not crash without prefs and still names Parth", () => {
    const prompt = buildMadhavSystemPrompt([verse], "en");
    expect(prompt).toContain("2.47");
    expect(prompt).toContain("The seeker's name is Parth");
    expect(prompt).toContain("under ~220 words");
    expect(prompt).toContain("personalised story");
    expect(prompt).toContain("never on every reply");
    expect(prompt).toContain("Citing none is allowed");
    expect(prompt).toContain("I understand how you feel");
    expect(prompt).not.toContain("1–3 concrete");
  });

  it("shortens the reply budget for practice-first seekers", () => {
    const prompt = buildMadhavSystemPrompt([verse], "en", {
      displayName: "Asha",
      goals: ["devotion"],
      guidanceStyle: "practice_first",
      dailyTimeMinutes: 10,
    });
    expect(prompt).toContain("name in the world is Asha");
    expect(prompt).toContain("well under 180 words");
    expect(prompt).not.toMatch(/Keep the whole reply under ~220 words\./);
  });
});

describe("madhavMaxTokens", () => {
  it("caps Madhav so a reply cannot become an essay", () => {
    expect(madhavMaxTokens(null)).toBe(700);
    expect(
      madhavMaxTokens({
        displayName: "",
        goals: [],
        guidanceStyle: "practice_first",
        dailyTimeMinutes: 10,
      })
    ).toBe(480);
  });
});

describe("composeMadhavToday", () => {
  it("returns a Parth greeting when nothing is known", () => {
    const copy = composeMadhavToday(emptyFacts());
    expect(copy.addressName).toBe("Parth");
    expect(copy.greeting).toContain("Parth");
    expect(copy.greeting).toContain("I am Madhav");
    expect(copy.starters).toHaveLength(3);
  });

  it("prefers a named festival over the verse of the day", () => {
    const copy = composeMadhavToday({
      ...emptyFacts(),
      displayName: "Saksham",
      votdRef: "2.47",
      festivalLabel: "Gita Jayanti",
    });
    expect(copy.greeting).toContain("Gita Jayanti");
    expect(copy.greeting).toContain("Saksham");
    expect(copy.greeting).not.toMatch(/^Today's verse is 2\.47/);
    expect(copy.starters[0]).toContain("2.47");
  });

  it("asks whether today's sit landed", () => {
    const copy = composeMadhavToday({
      ...emptyFacts(),
      doneToday: ["sit"],
      votdRef: "2.47",
    });
    expect(copy.greeting).toContain("You already sat today");
    expect(copy.greeting).toContain("Did that land");
    expect(copy.starters).toContain("I sat but my mind didn't");
  });

  it("adds a practice chip for practice-first seekers who have not sat", () => {
    const copy = composeMadhavToday({
      ...emptyFacts(),
      votdRef: "18.66",
      guidanceStyle: "practice_first",
      goals: ["inner_peace"],
    });
    expect(copy.starters).toContain("Today's verse — 18.66");
    expect(copy.starters).toContain("I haven't sat yet");
    expect(copy.starters).toContain("Guide me through a short practice");
  });
});

describe("fillName", () => {
  it("substitutes the address into i18n templates", () => {
    expect(fillName("{name}, I am Madhav.", "Asha")).toBe("Asha, I am Madhav.");
  });
});
