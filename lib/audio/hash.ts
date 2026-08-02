/**
 * FNV-1a 64-bit over normalized speech text — the join key between "text a
 * client wants to speak" and "pre-generated audio file in the bucket".
 *
 * Implemented with 16-bit limbs (no BigInt) so the exact same code runs in
 * Node generators, the web bundle (TS target < ES2020), and Hermes. Must stay
 * byte-identical with scripts/audio/hash.mjs and the app's src/audio/hash.ts.
 * test/audio-hash.test.ts pins the output against a BigInt reference.
 */
export function normalizeSpeechText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function speechHash(text: string): string {
  const bytes = new TextEncoder().encode(normalizeSpeechText(text));
  // Offset basis 0xcbf29ce484222325 in little-endian 16-bit limbs.
  let v0 = 0x2325;
  let v1 = 0x8422;
  let v2 = 0x9ce4;
  let v3 = 0xcbf2;
  for (let i = 0; i < bytes.length; i++) {
    v0 ^= bytes[i];
    // Multiply by the FNV prime 0x100000001b3 = 2^40 + 0x1b3.
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
