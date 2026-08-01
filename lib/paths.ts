/**
 * Themed multi-day practice paths (data/paths/*.json).
 */
import { readFileSync, readdirSync } from "fs";
import path from "path";

export type PathDay = {
  day: number;
  ref: { chapter: number; verse: number };
  practice: "sit" | "pranayama" | "japa" | "flow";
  minutes: number;
  title_en: string;
  title_hi: string;
  prompt_en: string;
  prompt_hi: string;
};

export type PracticePath = {
  id: string;
  days_count: number;
  title_en: string;
  title_hi: string;
  intro_en: string;
  intro_hi: string;
  days: PathDay[];
};

const PATH_ORDER = [
  "anxiety-7",
  "grief-7",
  "purpose-7",
  "relationships-7",
  "student-7",
];

const ROOT = path.join(process.cwd(), "data", "paths");

export function listPracticePaths(): PracticePath[] {
  let files: string[] = [];
  try {
    files = readdirSync(ROOT).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const loaded = files
    .map((f) => loadPracticePath(f.replace(/\.json$/, "")))
    .filter((p): p is PracticePath => Boolean(p));

  return loaded.sort((a, b) => {
    const ia = PATH_ORDER.indexOf(a.id);
    const ib = PATH_ORDER.indexOf(b.id);
    if (ia === -1 && ib === -1) return a.id.localeCompare(b.id);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function loadPracticePath(id: string): PracticePath | null {
  if (!/^[a-z0-9-]+$/i.test(id)) return null;
  try {
    const raw = readFileSync(path.join(ROOT, `${id}.json`), "utf8");
    const data = JSON.parse(raw) as PracticePath;
    if (!data?.id || !Array.isArray(data.days)) return null;
    return data;
  } catch {
    return null;
  }
}
