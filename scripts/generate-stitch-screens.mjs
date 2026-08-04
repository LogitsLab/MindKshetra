#!/usr/bin/env node
/**
 * Generate MindKshetra mobile screens via Google Stitch SDK.
 * Usage: STITCH_API_KEY=... node generate-stitch-screens.mjs [boards|p0|all|slug] [--force]
 */
import { stitch } from "@google/stitch-sdk";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROMPTS = join(ROOT, "docs/stitch-prompts");
const OUT = join(ROOT, "docs/stitch-output");

const MASTER = extractFenced(
  readFileSync(join(PROMPTS, "00-master-style.md"), "utf8")
);

/** Showcase boards matching the user’s premium mockup decks */
const BOARDS = [
  "01-onboarding",
  "02-home",
  "26-meditation-board",
  "27-astrology-panchang-board",
  "28-journal-board",
  "29-profile-progress-board",
];

/** Desktop web frames (1440-class) */
const WEB = [
  "34-web-home",
  "35-web-personalize-progress",
  "36-web-onboarding-welcome",
  "37-web-explore-sloka",
  "38-web-madhav-desktop",
  "39-web-astrology-suite",
  "40-web-practice-journal",
  "41-web-achievements",
];

/** Missing single phones that boards often truncate */
const GAPS = [
  "46-onboarding-welcome",
  "47-onboarding-goals",
  "48-onboarding-inspirations",
  "42-onboarding-time",
  "43-onboarding-setup",
  "18-meditation-hub",
  "19-meditation-player",
  "44-meditation-complete",
  "33-streak-progress",
  "45-progress-overview",
];

/** New flow: app boards + key screens + web */
const FLOW = [
  ...BOARDS,
  "05-sloka",
  "06-mood-grid",
  "08-madhav",
  "09-astrology-hub",
  "11-chart-detail",
  "25-account",
  "33-streak-progress",
  ...WEB,
];

const P0 = [
  ...BOARDS,
  "05-sloka",
  "06-mood-grid",
  "08-madhav",
  "09-astrology-hub",
  "11-chart-detail",
];

const ALL = [
  ...FLOW,
  "03-explore",
  "04-chapter",
  "07-mood-detail",
  "10-birth-form",
  "12-milan",
  "13-panchang",
  "14-votd",
  "15-favorites",
  "16-sadhana",
  "17-japa",
  "18-meditation-hub",
  "19-meditation-player",
  "20-paths",
  "21-path-day",
  "22-community",
  "23-care",
  "24-support",
  "30-muhurats",
  "31-horoscope",
  "32-journal-today",
];

function deviceFor(slug) {
  // Showcase boards need wide artboards; single phone screens stay MOBILE.
  const showcaseBoards = new Set([
    "01-onboarding",
    "26-meditation-board",
    "27-astrology-panchang-board",
    "28-journal-board",
    "29-profile-progress-board",
  ]);
  return showcaseBoards.has(slug) ||
    slug.startsWith("34-") ||
    slug.startsWith("35-") ||
    slug.startsWith("36-") ||
    slug.startsWith("37-") ||
    slug.startsWith("38-") ||
    slug.startsWith("39-") ||
    slug.startsWith("40-") ||
    slug.startsWith("41-") ||
    slug.includes("-web-") ||
    slug.endsWith("-board")
    ? "DESKTOP"
    : "MOBILE";
}
function extractFenced(md) {
  const m = md.match(/```\n([\s\S]*?)```/);
  return (m ? m[1] : md).trim();
}

function loadPrompt(slug) {
  const path = join(PROMPTS, `${slug}.md`);
  if (!existsSync(path)) throw new Error(`Missing prompt: ${path}`);
  const body = extractFenced(readFileSync(path, "utf8"));
  return `${MASTER}\n\n---\nScreen to design:\n${body}`;
}

async function download(url, dest) {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return dest;
}

async function main() {
  if (!process.env.STITCH_API_KEY) {
    console.error("Set STITCH_API_KEY");
    process.exit(1);
  }

  const arg = process.argv[2] || "flow";
  const force = process.argv.includes("--force");
  const known = new Set([...ALL, ...BOARDS, ...P0, ...WEB, ...FLOW, ...GAPS]);
  const slugs =
    arg === "all"
      ? ALL
      : arg === "boards"
        ? BOARDS
        : arg === "web"
          ? WEB
          : arg === "flow"
            ? FLOW
            : arg === "gaps"
              ? GAPS
              : arg === "p0"
                ? P0
                : known.has(arg)
                  ? [arg]
                  : null;
  if (!slugs) {
    console.error(
      "Usage: node generate-stitch-screens.mjs [flow|boards|web|gaps|p0|all|<slug>] [--force]"
    );
    process.exit(1);
  }

  mkdirSync(OUT, { recursive: true });
  const manifestPath = join(OUT, "manifest.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : { projectId: null, screens: {} };

  let project;
  if (manifest.projectId && !process.argv.includes("--new-project")) {
    console.log("Reusing project", manifest.projectId);
    project = stitch.project(manifest.projectId);
  } else {
    const title = "MindKshetra Flow v2";
    console.log("Creating Stitch project:", title);
    project = await stitch.createProject(title);
    manifest.projectId = project.id;
    if (process.argv.includes("--new-project")) {
      manifest.screens = {};
    }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log("Project ID:", project.id);
  }

  for (const slug of slugs) {
    if (!force && manifest.screens[slug]?.screenId) {
      console.log("Skip (exists):", slug, "(pass --force to regenerate)");
      continue;
    }
    console.log("\n=== Generating", slug, `(${deviceFor(slug)})`, "===");
    const prompt = loadPrompt(slug);
    const screen = await project.generate(
      prompt,
      deviceFor(slug),
      "GEMINI_3_FLASH"
    );
    const dir = join(OUT, slug);
    mkdirSync(dir, { recursive: true });

    let htmlUrl = null;
    let imageUrl = null;
    try {
      htmlUrl = await screen.getHtml();
    } catch (e) {
      console.warn("getHtml:", e.message);
    }
    try {
      imageUrl = await screen.getImage();
    } catch (e) {
      console.warn("getImage:", e.message);
    }

    if (htmlUrl) {
      if (htmlUrl.startsWith("http")) await download(htmlUrl, join(dir, "screen.html"));
      else writeFileSync(join(dir, "screen.html"), htmlUrl);
    }
    if (imageUrl) {
      if (imageUrl.startsWith("http")) await download(imageUrl, join(dir, "screen.png"));
      else writeFileSync(join(dir, "screen.png"), imageUrl);
    }

    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify(
        { slug, screenId: screen.id, projectId: project.id, htmlUrl, imageUrl },
        null,
        2
      )
    );

    manifest.screens[slug] = {
      screenId: screen.id,
      projectId: project.id,
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log("Done:", slug, "→", dir);
  }

  console.log("\nAll requested screens finished.");
  console.log("Project:", manifest.projectId);
  console.log("Open in Stitch UI and look for “MindKshetra App”.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
