import { describe, expect, it, vi } from "vitest";

const QWEN_38 = "qwen/qwen3.8-27b";

async function loadGroqDefaults() {
  vi.resetModules();
  delete process.env.GROQ_MODEL;
  delete process.env.GROQ_PREDICTIONS_MODEL;
  delete process.env.GROQ_HOUSES_MODEL;
  delete process.env.GROQ_PREDICTIONS_REASONING_EFFORT;
  return import("@/lib/groq");
}

describe("Groq model routing", () => {
  it("defaults chat, predictions, and houses to Qwen3.8 27B", async () => {
    const {
      GROQ_MODEL,
      GROQ_PREDICTIONS_MODEL,
      GROQ_HOUSES_MODEL,
    } = await loadGroqDefaults();
    expect(GROQ_MODEL).toBe(QWEN_38);
    expect(GROQ_PREDICTIONS_MODEL).toBe(QWEN_38);
    expect(GROQ_HOUSES_MODEL).toBe(QWEN_38);
  });

  it("uses high reasoning for one-shot predictions by default", async () => {
    const { GROQ_PREDICTIONS_REASONING_EFFORT } = await loadGroqDefaults();
    expect(GROQ_PREDICTIONS_REASONING_EFFORT).toBe("high");
  });
});
