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
{bucket}/ambient/meditation-drone.m4a      # tanpura-ish pad
{bucket}/ambient/bowls.m4a                 # singing-bowl bed
{bucket}/ambient/rain.m4a                  # rain bed
{bucket}/ambient/soft-bell.m4a             # optional one-shot at sit end
{bucket}/japa/{mantra-id}.m4a              # human japa clips (also bundled)
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
- App: `src/audio/` — warms manifest on boot; **downloads the m4a to
  device cache** (`expo-file-system`, `src/audio/cache.ts`) then plays a
  local URI. Do **not** wait on `isLoaded` before `play()` — that race
  was reverted. Sanskrit Listen is file-only (`playUrl`); never TTS-fallback
  Devanagari (Home carousel used to, and Android voices often failed).
- Manifest cached ~7 days on app (AsyncStorage); web uses HTTP cache
- After reboot, scheduled local notifications are not restored until the
  app opens (Android 15: `BOOT_COMPLETED` stripped so it cannot start
  expo-audio foreground services)

## Ambient loops (meditation)

Original short beds generated for this app (public domain / CC0 equivalent —
we hold the copyright and release them for free reuse):

| File | Use | License |
|------|-----|---------|
| `ambient/meditation-drone.m4a` | tanpura-ish pad | original, unrestricted |
| `ambient/bowls.m4a` | singing-bowl bed | original, unrestricted |
| `ambient/rain.m4a` | rain bed | original, unrestricted |
| `ambient/soft-bell.m4a` | sit-end one-shot | original, unrestricted |

Bundled copies also live in `MindKshetra-app/assets/audio/` so sits are never
dry if the bucket object 404s. The web origin also serves the same files from
`/audio/ambient/*.m4a` before falling back to a generated tanpura pad.
Attribution is not required; keep this table so store review can see provenance.

## Japa recitations (assisted mala)

Assisted japa plays a **bundled pre-recorded human clip** on each tap. Never
device TTS, never STT. Custom naam and catalog mantras without a free
isolated recording stay silent.

Clips live in `MindKshetra-app/assets/audio/japa/` and
`MindKshetra/public/audio/japa/` (AAC ~80 kbps mono). Format conversion and
loud-norm are adaptations of the sources below.

| File | Mantra | Source | License |
|------|--------|--------|---------|
| `japa/om.m4a` | oṁ | Tito Dutta, Wikimedia `File:Om pro.ogg` | CC BY-SA 3.0 |
| `japa/om-namo-bhagavate-vasudevaya.m4a` | oṁ namo bhagavate vāsudevāya | Tito Dutta, Wikimedia | CC BY-SA 3.0 |
| `japa/hare-krishna.m4a` | mahā-mantra (one cycle) | Lalanesha Dasa Prabhu, Jamendo / IA `jamendo-151553` | CC BY-SA 3.0 |
| `japa/so-ham.m4a` | so'ham | Gedney2001, Wikimedia `File:Soham.oga` | CC0 |
| `japa/om-namah-shivaya.m4a` | oṁ namaḥ śivāya | शिव साहिल, Wikimedia | CC BY-SA 4.0 |
| `japa/gayatri.m4a` | Gāyatrī | Rameshvar, Wikimedia wav used on English Wikipedia | CC0 |
| `japa/mahamrityunjaya.m4a` | Mahāmṛtyuñjaya | Rameshvar, Wikimedia `File:Mrityunjaya.ogg` | Free Art License |

No isolated CC recitation was found for `om-gam-ganapataye`, `sri-ram`, or
`om-shanti` that matched the catalog text (commercial albums and NC licenses
were skipped). Those three and custom naam do not play audio.

## Egress checklist

1. **Do not re-add `tts/`** — it was the largest multiplyable download surface
2. Object metadata uses `max-age=31536000`, but **Supabase `/object/public/…`
   responses currently advertise `Cache-Control: no-cache`**, so browsers/players
   re-fetch. Authenticated GET shows the real max-age; public CDN does not.
3. **Recommended fix:** host `recitation/` + `manifest.json` on **Cloudflare R2**
   (or similar) with free egress + proper `Cache-Control`, then point
   `NEXT_PUBLIC_AUDIO_BASE_URL` / `EXPO_PUBLIC_AUDIO_BASE_URL` at that origin
4. App recitation now disk-caches played m4a (`src/audio/cache.ts`)
5. Watch Supabase → Reports → Egress after R2 cutover; expect a cliff
