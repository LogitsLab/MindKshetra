/**
 * Supabase Storage plumbing for the audio pipeline. One public bucket
 * ("audio") holds every generated/fetched file plus manifest.json — the
 * lookup table both clients read. Reads env from .env like the other
 * scripts in scripts/.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const BUCKET = "audio";

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* file absent is fine */
    }
  }
}

export function adminClient() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (.env)"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function ensureBucket(supabase) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
    });
    if (error) throw new Error(`createBucket failed: ${error.message}`);
    console.log(`[audio] created public bucket "${BUCKET}"`);
  }
}

export async function uploadFile(supabase, path, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`upload ${path} failed: ${error.message}`);
}

const EMPTY_MANIFEST = {
  version: 1,
  tts: { en: {}, hi: {} },
  recitation: {},
  voice: null,
  recitationSource: null,
  updatedAt: null,
};

export async function loadManifest(supabase) {
  const { data } = await supabase.storage.from(BUCKET).download("manifest.json");
  if (!data) return structuredClone(EMPTY_MANIFEST);
  try {
    const parsed = JSON.parse(await data.text());
    return { ...structuredClone(EMPTY_MANIFEST), ...parsed };
  } catch {
    return structuredClone(EMPTY_MANIFEST);
  }
}

export async function saveManifest(supabase, manifest) {
  manifest.updatedAt = new Date().toISOString();
  await uploadFile(
    supabase,
    "manifest.json",
    Buffer.from(JSON.stringify(manifest, null, 2)),
    "application/json"
  );
}
