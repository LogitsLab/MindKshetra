/**
 * Golden accuracy suite for astrology engine — run: npm run qa:astrology
 * Fixtures use Swiss Ephemeris Lahiri longitudes (±0.05°).
 */
const { spawnSync } = require("child_process");
const path = require("path");

const runner = `
import { computeChart, healthSunLongitude } from "./lib/astrology/engine.ts";
import { getEphemerisMode } from "./lib/astrology/swe.ts";
import { longitudeToNavamsa, longitudeToDashamsa } from "./lib/astrology/vargas.ts";
import { longitudeToSubLords } from "./lib/astrology/kp.ts";
import { findCurrentDasha } from "./lib/astrology/dasha.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function near(a, b, tol, label) {
  const d = Math.abs(a - b);
  assert(d <= tol, label + ": got " + a + " expected " + b + " (Δ=" + d + ")");
}

const h = healthSunLongitude();
assert(h.ok, "health failed");
assert(h.ephemeris === "swiss" || h.ephemeris === "moshier", "bad ephemeris mode");
assert(h.engine.startsWith("2.1"), "engine should be 2.1.x, got " + h.engine);
assert(getEphemerisMode() === h.ephemeris, "mode mismatch");

// Fixed JD Sun: 1990-06-15 06:30 UTC Lahiri
near(h.sunLongitude, 60.1834, 0.05, "health sun lon");
near(h.ayanamsa, 23.7237, 0.05, "health ayanamsa");

const delhi = {
  name: "Delhi noon",
  dob: "1990-06-15",
  tob: "12:00:00",
  tobUnknown: false,
  placeLabel: "New Delhi",
  lat: 28.6139,
  lng: 77.209,
  ianaTz: "Asia/Kolkata",
  utcOffsetMinutes: 330,
};

const chart = computeChart(delhi);
assert(chart.engineVersion.startsWith("2.1"), "chart engine");
assert(chart.ephemerisMode === h.ephemeris, "chart ephemeris");
assert(chart.ascendant, "missing ascendant");
assert(chart.dasha.tree.length, "missing dasha");
assert(chart.kp?.cusps?.length === 12, "missing KP cusps");
assert(chart.kp?.significators?.length === 12, "missing significators");
assert(chart.verdicts.blended.length === 6, "blend count");
assert(chart.panchang?.tithi, "missing panchang");
assert(chart.dignities?.length >= 7, "missing dignities");
assert(chart.vargas?.d9?.planets?.length >= 9, "missing D9");
assert(chart.vargas?.d10?.planets?.length >= 9, "missing D10");
assert(Array.isArray(chart.aspects), "missing aspects");
assert(chart.transits?.asOfDate === chart.asOfDate, "transit asOf");
assert(Array.isArray(chart.transits?.emphasis), "transit emphasis");
assert(chart.lalKitab?.debts?.length, "missing lal kitab");
assert(chart.ayanamsaKp != null, "missing KP ayanamsa");
assert(Math.abs(chart.ayanamsa - chart.ayanamsaKp) > 0.01, "Lahiri vs KP should differ");

const sun = chart.planets.find((p) => p.id === "sun");
const moon = chart.planets.find((p) => p.id === "moon");
near(sun.longitude, 60.1834, 0.05, "chart sun lon");
near(moon.longitude, 318.578, 0.05, "chart moon lon");
assert(chart.overview.ascendantSign === "leo", "asc should be Leo, got " + chart.overview.ascendantSign);
near(chart.ascendant.longitude, 145.7, 0.5, "asc lon");

assert(moon.house != null, "vedic moon house");
const kpMoon = chart.kp.planets.find((p) => p.id === "moon");
assert(kpMoon?.house != null, "kp moon house");

assert(chart.dasha.tree[0]?.lord, "first maha");

const c1 = chart.kp.cusps[0];
const subs = longitudeToSubLords(c1.longitude);
assert(subs.subLord === c1.subLord, "sub lord consistency");
assert(c1.starLord && c1.subLord && c1.subSubLord, "cusp sub lords");

const n0 = longitudeToNavamsa(0);
assert(n0.signIndex === 0, "0° Aries D9");
const n15 = longitudeToNavamsa(15);
assert(n15.signIndex === 4, "15° Aries D9 should be Leo, got " + n15.signIndex);

const d10_0 = longitudeToDashamsa(0);
assert(d10_0.signIndex === 0, "0° Aries D10");

// Local vaar: 1990-06-15 12:00 Asia/Kolkata is Friday
assert(chart.panchang.vaar === "Friday", "local vaar Friday, got " + chart.panchang.vaar);

// Yogas catalog depth
assert(chart.yogas.length >= 8, "expected ≥8 yoga rules, got " + chart.yogas.length);

// Transit houses from natal Asc
const jupT = chart.transits.planets.find((p) => p.id === "jupiter");
assert(jupT?.house != null, "transit jupiter house");

// Second reference: Mumbai evening
const mumbai = computeChart({
  ...delhi,
  name: "Mumbai",
  dob: "1985-01-20",
  tob: "18:30:00",
  placeLabel: "Mumbai",
  lat: 19.076,
  lng: 72.8777,
});
assert(mumbai.ascendant, "mumbai asc");
const mSun = mumbai.planets.find((p) => p.id === "sun");
near(mSun.longitude, 276.0, 1.0, "mumbai sun ~Capricorn band");
assert(mumbai.overview.ascendantSign, "mumbai asc sign");
assert(mumbai.vargas.d9.ascendant?.sign, "mumbai d9 asc");

// Third: early morning Kolkata
const kolkata = computeChart({
  ...delhi,
  name: "Kolkata dawn",
  dob: "2000-03-21",
  tob: "06:15:00",
  placeLabel: "Kolkata",
  lat: 22.5726,
  lng: 88.3639,
});
assert(kolkata.ascendant, "kolkata asc");
near(kolkata.planets.find((p) => p.id === "sun").longitude, 336.5, 1.5, "kolkata sun");

// Fourth: night Chennai
const chennai = computeChart({
  ...delhi,
  name: "Chennai night",
  dob: "1975-11-08",
  tob: "22:40:00",
  placeLabel: "Chennai",
  lat: 13.0827,
  lng: 80.2707,
});
assert(chennai.ascendant, "chennai asc");
assert(chennai.aspects.length > 0, "chennai aspects");

// Fifth: London (UTC) — vaar local
const london = computeChart({
  ...delhi,
  name: "London",
  dob: "1990-06-15",
  tob: "01:00:00",
  placeLabel: "London",
  lat: 51.5074,
  lng: -0.1278,
  ianaTz: "Europe/London",
  utcOffsetMinutes: 60,
});
// 1990-06-15 01:00 BST ≈ Thursday local
assert(london.panchang.vaar === "Friday" || london.panchang.vaar === "Thursday", "london vaar local");

// Fixed-date dasha lord on Delhi chart
const asOf = "2020-01-01";
const cur = findCurrentDasha(chart.dasha.tree, asOf);
assert(cur.maha?.lord, "dasha lord on 2020-01-01");

// Unknown TOB: no KP / no Asc
const notob = computeChart({
  ...delhi,
  tob: null,
  tobUnknown: true,
});
assert(!notob.ascendant, "tob unknown should lack asc");
assert(notob.kp == null, "tob unknown should lack KP");
assert(notob.planets.find((p) => p.id === "sun"), "still has luminaries");
assert(notob.vargas.d10, "d10 without asc still builds planets");

console.log("qa:astrology OK", {
  ephemeris: chart.ephemerisMode,
  sun: chart.overview.sunSign,
  moon: chart.overview.moonSign,
  asc: chart.overview.ascendantSign,
  sunLon: sun.longitude.toFixed(3),
  moonLon: moon.longitude.toFixed(3),
  asOfDate: chart.asOfDate,
  engine: chart.engineVersion,
  kpSub1: c1.subLord,
  d9asc: chart.vargas.d9.ascendant?.sign,
  d10asc: chart.vargas.d10.ascendant?.sign,
  yogas: chart.yogas.length,
  aspects: chart.aspects.length,
  vaar: chart.panchang.vaar,
  dasha2020: cur.maha?.lord,
});
`;

const r = spawnSync("npx", ["--yes", "tsx", "-e", runner], {
  cwd: path.join(__dirname, ".."),
  encoding: "utf8",
  env: process.env,
});

process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
process.exit(r.status ?? 1);
