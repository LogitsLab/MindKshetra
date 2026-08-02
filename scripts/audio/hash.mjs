/**
 * FNV-1a 64-bit over normalized text — the shared key between generated audio
 * files and the clients that look them up. 16-bit-limb implementation,
 * byte-identical with lib/audio/hash.ts (web) and src/audio/hash.ts (app).
 */
export function normalizeSpeechText(text) {
  return text.replace(/\s+/g, " ").trim();
}

export function speechHash(text) {
  const bytes = new TextEncoder().encode(normalizeSpeechText(text));
  let v0 = 0x2325;
  let v1 = 0x8422;
  let v2 = 0x9ce4;
  let v3 = 0xcbf2;
  for (let i = 0; i < bytes.length; i++) {
    v0 ^= bytes[i];
    let t0 = v0 * 0x1b3;
    let t1 = v1 * 0x1b3;
    let t2 = v2 * 0x1b3;
    let t3 = v3 * 0x1b3;
    t2 += v0 << 8;
    t3 += v1 << 8;
    t1 += t0 >>> 16;
    t2 += t1 >>> 16;
    t3 += t2 >>> 16;
    v0 = t0 & 0xffff;
    v1 = t1 & 0xffff;
    v2 = t2 & 0xffff;
    v3 = t3 & 0xffff;
  }
  return (
    v3.toString(16).padStart(4, "0") +
    v2.toString(16).padStart(4, "0") +
    v1.toString(16).padStart(4, "0") +
    v0.toString(16).padStart(4, "0")
  );
}
