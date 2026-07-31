#!/usr/bin/env node
/**
 * Apply every supabase/migrations/*.sql to a project via the Management API.
 *
 *   node scripts/apply-migrations.cjs <project-ref>
 *
 * Why not `supabase db push`: this repo's migrations are numbered 001_… which
 * the CLI's <timestamp>_name.sql convention silently ignores — push reports
 * "up to date" while applying nothing. The Management API path runs the files
 * verbatim; every migration is written idempotently, so re-running after new
 * files land is safe.
 *
 * Auth: a personal access token from `npx supabase login`, read from
 * ~/.supabase/access-token, the macOS keychain, or $SUPABASE_ACCESS_TOKEN.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");

const ref = process.argv[2];
if (!ref || !/^[a-z]{20}$/.test(ref)) {
  console.error("Usage: node scripts/apply-migrations.cjs <project-ref>");
  process.exit(1);
}

function readToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }
  try {
    return fs
      .readFileSync(path.join(os.homedir(), ".supabase", "access-token"), "utf8")
      .trim();
  } catch {
    /* fall through */
  }
  try {
    return execSync('security find-generic-password -s "Supabase CLI" -w', {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const token = readToken();
if (!token) {
  console.error("No access token. Run `npx supabase login` first.");
  process.exit(1);
}

const dir = path.join(__dirname, "..", "supabase", "migrations");
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

(async () => {
  let failed = 0;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          // Cloudflare rejects default script user agents.
          "User-Agent": "mindkshetra-migrations/1.0",
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    if (res.ok) {
      console.log(`applied ${file}`);
    } else {
      failed += 1;
      console.error(`FAILED ${file}: ${res.status} ${await res.text()}`);
    }
  }
  console.log(failed === 0 ? "All migrations applied." : `${failed} failed.`);
  process.exit(failed === 0 ? 0 : 1);
})();
