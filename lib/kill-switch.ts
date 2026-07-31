import "server-only";

/**
 * Operational pause flags for community surfaces. Engaged when the env var
 * is set to any common "off" spelling — an incident control must respond to
 * operator intent ("false", "off", a value pasted with a stray space), not
 * exact-string luck. Unset or affirmative values leave the surface live.
 */
const OFF_VALUES = new Set(["0", "false", "off", "no"]);

export function killSwitchEngaged(name: string): boolean {
  const raw = process.env[name];
  if (raw == null) return false;
  return OFF_VALUES.has(raw.trim().toLowerCase());
}
