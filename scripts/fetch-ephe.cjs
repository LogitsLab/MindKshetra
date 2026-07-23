/**
 * Download Swiss Ephemeris planet/moon files into ./ephemeris
 * Run: node scripts/fetch-ephe.cjs
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..", "ephemeris");
const BASE =
  "https://cdn.jsdelivr.net/gh/aloistr/swisseph@master/ephe";
const FILES = ["sepl_18.se1", "semo_18.se1", "seas_18.se1"];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      })
      .on("error", (err) => {
        try {
          fs.unlinkSync(dest);
        } catch {
          /* ignore */
        }
        reject(err);
      });
  });
}

async function main() {
  fs.mkdirSync(ROOT, { recursive: true });
  for (const name of FILES) {
    const dest = path.join(ROOT, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
      console.log("skip (exists):", name);
      continue;
    }
    process.stdout.write(`fetching ${name}… `);
    await download(`${BASE}/${name}`, dest);
    console.log(`${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
  }
  console.log("ephemeris ready:", ROOT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
