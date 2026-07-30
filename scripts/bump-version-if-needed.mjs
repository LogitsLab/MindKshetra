#!/usr/bin/env node
/**
 * Bump patch version in package.json when main advances without a version change.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const PACKAGE_JSON = "package.json";
const PACKAGE_LOCK = "package-lock.json";
const BEFORE_SHA = process.env.GITHUB_BEFORE_SHA?.trim();

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function bumpPatch(version) {
  const parts = version.split(".").map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid semver: ${version}`);
  }
  parts[2] += 1;
  return parts.join(".");
}

function gitShow(path, sha) {
  try {
    return execSync(`git show ${sha}:${path}`, { encoding: "utf8" });
  } catch {
    return null;
  }
}

function syncPackageFiles(nextVersion) {
  const pkg = readJson(PACKAGE_JSON);
  pkg.version = nextVersion;
  writeJson(PACKAGE_JSON, pkg);

  const lock = readJson(PACKAGE_LOCK);
  lock.version = nextVersion;
  if (lock.packages?.[""]) {
    lock.packages[""].version = nextVersion;
  }
  writeJson(PACKAGE_LOCK, lock);
}

if (!BEFORE_SHA || /^0+$/.test(BEFORE_SHA)) {
  console.log("No prior SHA — skipping version bump.");
  process.exit(0);
}

const beforePkg = gitShow(PACKAGE_JSON, BEFORE_SHA);
if (!beforePkg) {
  console.log("Could not read prior package.json — skipping.");
  process.exit(0);
}

const oldVersion = JSON.parse(beforePkg).version;
const currentVersion = readJson(PACKAGE_JSON).version;

if (!oldVersion || !currentVersion) {
  throw new Error("Missing version in package.json");
}

if (oldVersion !== currentVersion) {
  console.log(
    `Version already changed in this push (${oldVersion} → ${currentVersion}). Skipping.`
  );
  process.exit(0);
}

const nextVersion = bumpPatch(currentVersion);
console.log(`Auto-bumping patch: ${currentVersion} → ${nextVersion}`);
syncPackageFiles(nextVersion);
process.exit(42);
