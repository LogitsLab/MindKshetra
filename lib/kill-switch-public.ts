/**
 * Client-readable mirror of the community kill switches.
 *
 * Soft-sangha share CTAs were removed from JournalBox / mobile verse journal
 * (private reflections only) until G1/G2/G3 gates pass. These helpers stay
 * false for UI surfaces so env typos cannot resurrect half-gated community.
 * The API still uses server-side `killSwitchEngaged` as a hard guard.
 *
 * Same fail-safe reading as the server: unset or unrecognised means PAUSED.
 */
const ON_VALUES = new Set(["1", "true", "on", "yes"]);

/** Soft sangha UI stays dark until product re-enables share surfaces. */
const SOFT_SANGHA_UI = false;

function open(raw: string | undefined): boolean {
  if (!SOFT_SANGHA_UI) return false;
  if (raw == null) return false;
  return ON_VALUES.has(raw.trim().toLowerCase());
}

/** Sharing a reflection to a verse page. */
export function reflectionsOpen(): boolean {
  return open(process.env.NEXT_PUBLIC_COMMUNITY_REFLECTIONS_ENABLED);
}

/** Reporting someone else's reflection. */
export function reportsOpen(): boolean {
  return open(process.env.NEXT_PUBLIC_COMMUNITY_REPORTS_ENABLED);
}
