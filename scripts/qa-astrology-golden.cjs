/**
 * Golden checks for astrology engine — run: npm run qa:astrology
 */
const { spawnSync } = require("child_process");
const path = require("path");

const runner = `
import { computeChart, healthSunLongitude } from "./lib/astrology/engine.ts";

const h = healthSunLongitude();
if (!h.ok) throw new Error("health failed");
if (h.sunLongitude < 50 || h.sunLongitude > 70) {
  throw new Error("Sun longitude out of band: " + h.sunLongitude);
}

const chart = computeChart({
  name: "Test",
  dob: "1990-06-15",
  tob: "12:00:00",
  tobUnknown: false,
  placeLabel: "New Delhi",
  lat: 28.6139,
  lng: 77.209,
  ianaTz: "Asia/Kolkata",
  utcOffsetMinutes: 330,
});

if (!chart.ascendant) throw new Error("missing ascendant");
if (!chart.dasha.tree.length) throw new Error("missing dasha");
if (!chart.kp?.cusps?.length) throw new Error("missing KP cusps");
if (chart.verdicts.blended.length !== 6) throw new Error("blend count");

console.log("qa:astrology OK", {
  sun: chart.overview.sunSign,
  moon: chart.overview.moonSign,
  asc: chart.overview.ascendantSign,
  sunLon: chart.planets.find((p) => p.id === "sun")?.longitude.toFixed(2),
  asOfDate: chart.asOfDate,
  engine: chart.engineVersion,
});

if (!chart.asOfDate) throw new Error("missing asOfDate");
if (chart.asOfDate.length !== 10 || chart.asOfDate[4] !== "-" || chart.asOfDate[7] !== "-") {
  throw new Error("bad asOfDate: " + chart.asOfDate);
}
if (chart.overview.currentPratyantar === undefined) {
  throw new Error("missing currentPratyantar field");
}
`;

const r = spawnSync("npx", ["--yes", "tsx", "-e", runner], {
  cwd: path.join(__dirname, ".."),
  encoding: "utf8",
  env: process.env,
});

process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
process.exit(r.status ?? 1);
