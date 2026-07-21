#!/usr/bin/env node
/**
 * Print migration SQL files for manual apply in Supabase SQL editor.
 * Run: npm run db:migrate
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "supabase", "migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

console.log("Apply these files in order via Supabase Dashboard → SQL Editor:\n");
for (const f of files) {
  console.log(`  supabase/migrations/${f}`);
}
console.log(
  "\nOr use Supabase CLI: supabase db push\n"
);
