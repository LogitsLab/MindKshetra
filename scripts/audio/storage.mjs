/**
 * Supabase Storage plumbing for the audio pipeline. One public bucket
 * ("audio") holds every generated/fetched file plus manifest.json — the
 * lookup table both clients read. Reads env from .env like the other
 * scripts in scripts/.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const BUCKET = "audio";

/** Immutable audio clips — edge caches for a year; path changes = new object. */
export const CACHE_AUDIO = "31536000";
/** Manifest can refresh daily without a client release. */
export const CACHE_MANIFEST = "86400";

export function loadEnv() {
  // AUDIO_ENV_FILE pins generation to one project. Without it, .env.local
  // (the dev database) would silently win over .env and audio would upload
  // to a bucket production clients never see.
  const files = process.env.AUDIO_ENV_FILE
    ? [process.env.AUDIO_ENV_FILE]
    : [".env.local", ".env"];
  for (const file of files) {
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

export async function uploadFile(
  supabase,
  path,
  buffer,
  contentType,
  cacheControl = path === "manifest.json" ? CACHE_MANIFEST : CACHE_AUDIO
) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
    cacheControl,
  });
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
    "application/json",
    CACHE_MANIFEST
  );
}

/** List every object under a prefix (paginated). */
export async function listAll(supabase, prefix) {
  const out = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    if (!data?.length) break;
    for (const row of data) {
      // Skip folder placeholders (no size / no file extension).
      if (!row.name || row.name.endsWith("/")) continue;
      const isFolder =
        row.id == null &&
        (row.metadata == null || row.metadata.size == null) &&
        !row.name.includes(".");
      if (isFolder) continue;
      out.push(`${prefix ? `${prefix}/` : ""}${row.name}`);
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return out;
}
