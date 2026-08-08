# Audio pipeline

Lean corpus: **human Sanskrit recitation only** in Supabase Storage. EN/HI
narration uses on-device TTS as a free fallback (no bucket files). Everything
is served from the public bucket `audio` on **MindKshetra-prod**
(`bpxszivjvexmqznnshlx`) with long-lived `Cache-Control` so Cloudflare can
edge-cache and egress stays low. Clients may still point
`*_AUDIO_BASE_URL` at this prod bucket while auth runs on MindKshetra-dev.

## Bucket layout

```
{bucket}/manifest.json
{bucket}/recitation/{chapter}-{verse}.m4a   # human, AAC ~80kbps
{bucket}/ambient/meditation-drone.m4a      # optional loop under silence
{bucket}/ambient/soft-bell.m4a             # optional one-shot at sit end
```

`tts/` was purged (Sarvam AI clips). Do **not** re-run `audio:tts` unless you
intentionally bring AI narration back — it doubles storage and egress.

## How lookup works

- **Recitation:** `manifest.recitation["{chapter}-{verse}"]` → `{base}/{path}`
- **EN/HI speech:** no pre-generated files; clients use device TTS

## Cache / egress policy

| Object | Cache-Control |
|--------|----------------|
| `recitation/*`, `ambient/*` | `max-age=31536000` (1 year) |
| `manifest.json` | `max-age=86400` (1 day) |

Upload helpers set this automatically. To repair existing objects:

```
AUDIO_ENV_FILE=.env npm run audio:cache -- --dry-run
AUDIO_ENV_FILE=.env npm run audio:cache -- --yes
```

Purge AI narration (idempotent after first run):

```
AUDIO_ENV_FILE=.env npm run audio:purge-tts -- --dry-run
AUDIO_ENV_FILE=.env npm run audio:purge-tts -- --yes
```

## Sanskrit recitation — humans, not TTS

```
npm run audio:recitation -- \
  --pattern="https://…/{chapter}/{verse}.mp3" \
  --attribution="…" \
  --license="…" \
  --chapters=1-2 --limit=5 --dry-run
```

### Default voice (2026-08-06 comparison)

| | **Ved Vyas (default)** | IIT Kanpur / Swami Brahmananda |
|--|------------------------|--------------------------------|
| Source | bhagavadgita.io (`gita/gita`) | Gita Supersite (permission obtained) |
| Coverage | **701 / 701** | Live URLs broken; Wayback ~partial (~90 captures) |
| Upstream encode | 32 kbps, 22.05 kHz mono | Archived copies 16 kbps, 16 kHz mono |
| Served as | AAC ~80 kbps m4a | — |
| License | Unlicense (public domain) | Written permission (IIT) |

**Decision: keep Ved Vyas as default.** Clearer fidelity and full corpus today.
If IIT later provides a complete high-bitrate archive, re-run `audio:recitation`
with `--attribution` / `--license` to replace in place (same `recitation/{c}-{v}.m4a`
keys).

Current production coverage: all **701** verses, Ved Vyas, AAC ~80 kbps.

## Client behavior

- Web: `lib/audio/narration.ts` — recitation from URL; EN/HI → `speechSynthesis`
- App: `src/audio/` — warms manifest on boot, prefetches recitation on Listen
  mount, waits for player load before `play()`
- Manifest cached ~7 days on app (AsyncStorage); web uses HTTP cache

## Egress checklist

1. **Do not re-add `tts/`** — it was the largest multiplyable download surface
2. Object metadata uses `max-age=31536000`, but **Supabase `/object/public/…`
   responses currently advertise `Cache-Control: no-cache`**, so browsers/players
   re-fetch. Authenticated GET shows the real max-age; public CDN does not.
3. **Recommended fix:** host `recitation/` + `manifest.json` on **Cloudflare R2**
   (or similar) with free egress + proper `Cache-Control`, then point
   `NEXT_PUBLIC_AUDIO_BASE_URL` / `EXPO_PUBLIC_AUDIO_BASE_URL` at that origin
4. Optional next: device disk-cache for played m4a (`expo-file-system`)
5. Watch Supabase → Reports → Egress after R2 cutover; expect a cliff
