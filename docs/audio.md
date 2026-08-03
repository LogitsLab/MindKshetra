# Audio pipeline

Replaces robotic device TTS with real narration and recitation, at zero/near-zero
cost for a non-profit. Everything is **pre-generated once** and served as static
files from the public Supabase Storage bucket `audio`; clients fall back to
device TTS whenever a file is absent, so the pipeline can be filled gradually
with no client release.

## How lookup works

Every fixed spoken string (verse translations, meditation/journey phase texts)
is keyed by an FNV-1a-64 hash of its normalized text. Clients hash the text
they are about to speak and check `manifest.json`:

```
{bucket}/manifest.json        → { tts: {en: {hash: path}, hi: {...}},
                                  recitation: {"1-1": path, ...} }
{bucket}/tts/{lang}/{hash}.m4a
{bucket}/recitation/{chapter}-{verse}.m4a
```

The hash implementation is copied byte-identically in three places —
`scripts/audio/hash.mjs`, `lib/audio/hash.ts` (web), `src/audio/hash.ts`
(app) — and pinned by `test/audio-hash.test.ts`. If content text changes,
re-run generation; old hashes simply stop being referenced.

## 1. Narration (Sarvam TTS) — translations + meditations

[Sarvam AI](https://www.sarvam.ai)'s `bulbul` voices are the best natural
Hindi we found at non-profit-friendly pricing, with free signup credits that
comfortably cover this corpus.

1. Create a key at https://dashboard.sarvam.ai → add `SARVAM_API_KEY=` to `.env`
   (optional: `SARVAM_TTS_SPEAKER`, `SARVAM_TTS_MODEL`).
2. `brew install ffmpeg` if absent.
3. Dry-run to see scope: `npm run audio:tts -- --dry-run`
4. Small test batch: `npm run audio:tts -- --limit=10`, then listen to a file
   from the bucket before committing to the full run.
5. Full run (resumable — reruns skip existing files):
   `npm run audio:tts`

Corpus ≈ 701 verses × 2 languages + all meditation phases. The script saves
manifest progress every 25 files, so interruptions are safe.

## 2. Sanskrit recitation — humans, not TTS

TTS cannot chant; the shloka audio must come from a human recitation with a
**documented license**. The fetcher refuses to run without `--attribution` and
`--license` flags precisely so consent is recorded in the manifest:

```
npm run audio:recitation -- \
  --pattern="https://…/{chapter}-{verse}.mp3" \
  --attribution="Recitation by …" \
  --license="Written permission from …, 2026-08-02" \
  --chapters=1-2 --limit=5 --dry-run
```

It validates responses are real audio (magic bytes — Gita Supersite's old URL
patterns now soft-404 with HTML), re-encodes to m4a, and uploads.

### Current coverage: all 701 verses, one voice (2026-08-03)

**Shri Ved Vyas Foundation — bhagavadgita.io**: complete per-verse recitations
from https://github.com/gita/gita
(`data/verse_recitation/{chapter}/{verse}.mp3`), released under **The
Unlicense** (public domain). Versification matches `data/slokas.json` exactly
(701 verses, chapter-by-chapter). The owner chose this single-voice corpus
over mixing in the 65 Swami Brahmananda (Gita Supersite) verses recoverable
from the Internet Archive — those were the only per-verse files the Wayback
Machine ever captured (verified by domain-wide CDX enumeration; the live
site's 2026 redesign dropped audio entirely), so a consistent IIT Kanpur
corpus is impossible without their full offline archive.

The fetcher gap-fills — existing manifest keys are skipped — so re-running the
same pattern is a cheap no-op resume. To *replace* existing audio (e.g. if the
full IIT Kanpur archive ever arrives), overwrite the storage files at the same
`recitation/{chapter}-{verse}.m4a` paths; manifest keys stay valid.

### Getting permission from IIT Kanpur (Gita Supersite)

The Gita Supersite (gitasupersite.in, formerly gitasupersite.iitk.ac.in) hosts
complete verse-by-verse recitations, © IIT Kanpur. Draft request — send from
the project's contact address:

> Subject: Permission request — Bhagavad Gita recitation audio for a
> non-profit open-source app
>
> Respected Gita Supersite team,
>
> MindKshetra (https://mind.logitslab.com, source:
> https://github.com/LogitsLab/MindKshetra) is a free, non-profit,
> open-source Bhagavad Gita companion — 701 verses with translations,
> reflection tools, and daily practice, in English and Hindi, with no
> advertising and no paid tiers.
>
> We would like permission to include the Gita Supersite's verse-by-verse
> Sanskrit recitation audio in the app and website, so readers can hear each
> shloka recited properly rather than through synthetic text-to-speech. We
> will credit the Gita Supersite and IIT Kanpur prominently wherever the
> audio plays, host copies ourselves (no load on your servers), and restrict
> use to this non-commercial project.
>
> If a different attribution, format, or agreement would suit you better, we
> are happy to comply. Thank you for building and maintaining this
> extraordinary resource.

Alternative sources while awaiting a reply: archive.org hosts several complete
recitations — check each item's license metadata (public domain / CC marks)
before pointing the fetcher at one, and record the item URL in `--license`.

## 3. Suggested next layer (not yet built)

A quiet tanpura/om drone under meditation narration transforms perceived
quality. Source a CC0 loop (e.g. freesound.org, filter license "CC0"), then
mix at generation time with ffmpeg (`amix` at ~-20 dB) — a small extension to
`generate-tts.mjs` once an asset with clean provenance is chosen.

## Client behavior

- Web: `lib/audio/narration.ts` — `playOrSpeak()` tries the manifest URL,
  falls back to `speechSynthesis`. Used by `SpeakButton` (chat, stories) and
  `MeditationPlayerClient`.
- App: `src/audio/` mirrors this with `expo-audio`, plus Sanskrit recitation
  on the verse screen's Speak action when available.
- Both cache the manifest per session/day; a missing manifest means "TTS as
  before", never an error.
