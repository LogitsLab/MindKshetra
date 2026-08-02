/**
 * Sarvam AI text-to-speech (bulbul model) — chosen for natural Hindi at
 * non-profit-friendly pricing with free signup credits. Needs SARVAM_API_KEY
 * in .env (create one at https://dashboard.sarvam.ai).
 *
 * The API accepts limited characters per request, so long passages are split
 * on sentence boundaries and the WAV chunks are concatenated by the caller
 * (ffmpeg). If Sarvam changes the request shape, this file is the only place
 * to touch.
 */
const ENDPOINT = "https://api.sarvam.ai/text-to-speech";
const MAX_CHARS = 450;

export function sarvamConfigured() {
  return Boolean(process.env.SARVAM_API_KEY?.trim());
}

export function splitForTts(text) {
  const chunks = [];
  let current = "";
  // Devanagari danda, purna viram, and latin sentence enders all count.
  const sentences = text.split(/(?<=[।.?!])\s+/);
  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > MAX_CHARS && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = (current + " " + sentence).trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/** Returns a Buffer of WAV audio for one chunk of text. */
export async function sarvamTtsChunk(text, lang) {
  const key = process.env.SARVAM_API_KEY?.trim();
  if (!key) throw new Error("SARVAM_API_KEY missing");

  const body = {
    text,
    target_language_code: lang === "hi" ? "hi-IN" : "en-IN",
    speaker: process.env.SARVAM_TTS_SPEAKER?.trim() || "anushka",
    model: process.env.SARVAM_TTS_MODEL?.trim() || "bulbul:v2",
    speech_sample_rate: 22050,
    enable_preprocessing: true,
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "api-subscription-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Sarvam TTS ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const b64 = Array.isArray(data.audios) ? data.audios[0] : data.audio;
  if (!b64) {
    throw new Error(
      `Sarvam TTS returned no audio (keys: ${Object.keys(data).join(", ")})`
    );
  }
  return Buffer.from(b64, "base64");
}
