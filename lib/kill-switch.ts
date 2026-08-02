import "server-only";

/**
 * Operational pause flags for community surfaces.
 *
 * Engaged when the env var says any common "off" spelling — an incident
 * control must respond to operator intent ("false", "off", a value pasted with
 * a stray space), not exact-string luck.
 *
 * UNSET MEANS PAUSED, deliberately. This used to default live, which left a
 * public user-generated-content surface one forgotten Vercel variable away
 * from opening by itself — while ROADMAP.md says those surfaces stay dark
 * until the G1/G2/G3 gates pass, and while the block endpoint still has no UI
 * to obtain the id it requires. A gate that depends on someone remembering to
 * close it is not a gate. Opening a surface now takes an affirmative value
 * (`true`/`1`/`on`/`yes`) — a deliberate act, with the gate decision behind it.
 */
const OFF_VALUES = new Set(["0", "false", "off", "no"]);
const ON_VALUES = new Set(["1", "true", "on", "yes"]);

export function killSwitchEngaged(name: string): boolean {
  const raw = process.env[name];
  if (raw == null) return true;
  const value = raw.trim().toLowerCase();
  if (ON_VALUES.has(value)) return false;
  if (OFF_VALUES.has(value)) return true;
  // An unrecognised value is operator error; fail to the safe side rather than
  // guessing that a typo meant "open this to the public".
  return true;
}
