# Store release — product notes

App implementation and Expo-specific QA live in the mobile repo
`MindKshetra-app/docs/STORE_CHECKLIST.md`. This file is the **web/API repo**
copy of store policy so Play/App Store rules are not only on the client.

## Who submits to App Review

Apple’s App Review “Submitted By” column is whoever **sent the version to
review**, not who uploaded the IPA.

- Uploading with the App Store Connect API key (`eas submit`, `--auto-submit`)
  shows as **API user {Key ID}**.
- **Submit for Review** must be done in the App Store Connect website while
  logged in as **Saksham Chaurasia**. Never via ASC API, Fastlane
  `submit_for_review`, or any `eas` flag that sends the version to review.

TestFlight / Play binary upload via EAS + API key is fine.

## Android / Google Play quality (upcoming)

Portrait lock is **iOS-only**. Android `orientation` stays `default` so Play
does not see `screenOrientation=portrait` on `MainActivity`.

Play’s [26 Aug 2026 quality post](https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html)
and [technical quality requirements](https://support.google.com/googleplay/android-developer/answer/17492799)
are **upcoming**, not the current binary. Missing them after the dates below
can cut visibility and publishing. MindKshetra is an **app** (not a game) on
phone/tablet.

### Memory + DEX — enforce Feb 2027

Play scores **P90 over 28 days**, Android 13+, by RAM tier and process state.
Anon RSS + swap for apps (4 GB devices): **2 GB** foreground, **1 GB**
background / user-perceived services. Higher RAM tiers are looser. Bitmap P90
must stay **≤ 200 MB** in background / user-perceived services and **≤ 400 MB**
cached (foreground has no bitmap cap in the table).

- Production EAS Android builds minify with **R8** (Expo release default). Do
  not ship a debug APK/AAB to Play.
- After the first Play AAB, open **App bundle explorer** and confirm DEX
  shrink / optimize / obfuscate are each **≥ 25%** if DEX is **> 10 MB** (apps
  under 10 MB DEX are not forced).
- The Expo client downsamples hero bitmaps (`CoverImage` `resizeMethod="resize"`
  on Android). Watch Android vitals **Memory** (anon RSS + swap, bitmap) once
  production traffic exists.
- Audio foreground services and `BOOT_COMPLETED` are stripped in the Expo
  config plugin so a background process does not inflate RSS.

### Zero-Tap Sign-In — enforce Apr 2027

Any app with sign-in (optional or required) must restore the **active**
session on a new phone/tablet via the
[Restore Credentials API](https://developer.android.com/identity/sign-in/restore-credentials)
(Android 9+), when the user restores from D2D or cloud backup. Guest /
signed-out users must stay unsigned-in. Games are exempt; we are not a game.

Mobile Google sign-in is still **browser OAuth**. That does **not** meet this
rule. Credential Manager restore + writing a restore key on sign-in (and
deleting it on logout) is a native auth rewrite in MindKshetra-app — **do not
block the current binary**. Block Store only counts if it was live on or
before **30 Sep 2026**; we never shipped it, so the path is Restore
Credentials, not Block Store.

Web sign-in (cookies) is out of scope for this Play rule; it applies to the
Android client only.
