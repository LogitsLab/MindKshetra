import { describe, expect, it } from "vitest";
import {
  GROQ_PREDICTIONS_MODEL,
  GROQ_PREDICTIONS_REASONING_EFFORT,
  GROQ_MODEL,
} from "@/lib/groq";

describe("Groq model routing", () => {
  it("keeps chat on the fast default model", () => {
    expect(GROQ_MODEL).toBeTruthy();
    expect(GROQ_MODEL).not.toBe(GROQ_PREDICTIONS_MODEL);
  });

  it("uses a GPT-OSS reasoning model for predictions by default", () => {
    expect(GROQ_PREDICTIONS_MODEL).toMatch(/^openai\/gpt-oss/);
    expect(["low", "medium", "high"]).toContain(
      GROQ_PREDICTIONS_REASONING_EFFORT
    );
  });
});
