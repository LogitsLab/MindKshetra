import { DateTime } from "luxon";
import {
  DASHA_YEARS,
  VIMSHOTTARI_ORDER,
  longitudeToNakshatra,
} from "@/lib/astrology/signs";
import type { DashaPeriod, PlanetId } from "@/lib/astrology/types";

const DAYS_PER_YEAR = 365.2425;

function dashaLengthDays(lord: PlanetId): number {
  const years = DASHA_YEARS[lord as Exclude<PlanetId, "ascendant">];
  if (!years) return 0;
  return years * DAYS_PER_YEAR;
}

function nextLords(from: PlanetId): PlanetId[] {
  const start = VIMSHOTTARI_ORDER.indexOf(from);
  const out: PlanetId[] = [];
  for (let i = 0; i < 9; i++) {
    out.push(VIMSHOTTARI_ORDER[(start + i) % 9]);
  }
  return out;
}

/**
 * Vimshottari balance at birth from Moon longitude (nakshatra progression).
 * Returns remaining days of the birth Mahadasha and the lord.
 */
export function dashaBalanceAtBirth(moonLongitude: number): {
  lord: PlanetId;
  balanceDays: number;
  elapsedDays: number;
  totalDays: number;
} {
  const { nakshatraIndex, lord } = longitudeToNakshatra(moonLongitude);
  const span = 360 / 27;
  const start = nakshatraIndex * span;
  const elapsedFrac = (moonLongitude - start) / span;
  const totalDays = dashaLengthDays(lord);
  const elapsedDays = elapsedFrac * totalDays;
  const balanceDays = totalDays - elapsedDays;
  return { lord, balanceDays, elapsedDays, totalDays };
}

function buildAntar(
  mahaLord: PlanetId,
  mahaStart: DateTime,
  mahaEnd: DateTime
): DashaPeriod[] {
  const lords = nextLords(mahaLord);
  const mahaDays = mahaEnd.diff(mahaStart, "days").days;
  const mahaYears =
    DASHA_YEARS[mahaLord as Exclude<PlanetId, "ascendant">] || 1;
  let cursor = mahaStart;
  const periods: DashaPeriod[] = [];

  for (const lord of lords) {
    const antarYears =
      (DASHA_YEARS[lord as Exclude<PlanetId, "ascendant">] / 120) * mahaYears;
    // Scale antardasha into the (possibly truncated) maha window proportionally
    // when using balance-at-birth for first maha.
    const idealDays = antarYears * DAYS_PER_YEAR;
    const fullMahaDays = mahaYears * DAYS_PER_YEAR;
    const scaledDays = (idealDays / fullMahaDays) * mahaDays;
    const end = cursor.plus({ days: scaledDays });
    const clampedEnd = end < mahaEnd ? end : mahaEnd;
    if (clampedEnd <= cursor) break;

    const children = buildPratyantar(mahaLord, lord, cursor, clampedEnd);
    periods.push({
      lord,
      start: cursor.toISODate()!,
      end: clampedEnd.toISODate()!,
      level: "antar",
      children,
    });
    cursor = clampedEnd;
    if (cursor >= mahaEnd) break;
  }
  return periods;
}

function buildPratyantar(
  mahaLord: PlanetId,
  antarLord: PlanetId,
  antarStart: DateTime,
  antarEnd: DateTime
): DashaPeriod[] {
  const lords = nextLords(antarLord);
  const antarDays = antarEnd.diff(antarStart, "days").days;
  const mahaYears =
    DASHA_YEARS[mahaLord as Exclude<PlanetId, "ascendant">] || 1;
  const antarYears =
    (DASHA_YEARS[antarLord as Exclude<PlanetId, "ascendant">] / 120) *
    mahaYears;
  let cursor = antarStart;
  const periods: DashaPeriod[] = [];

  for (const lord of lords) {
    const pratyYears =
      (DASHA_YEARS[lord as Exclude<PlanetId, "ascendant">] / 120) * antarYears;
    const idealDays = pratyYears * DAYS_PER_YEAR;
    const fullAntarDays = antarYears * DAYS_PER_YEAR;
    const scaledDays =
      fullAntarDays > 0 ? (idealDays / fullAntarDays) * antarDays : 0;
    const end = cursor.plus({ days: scaledDays });
    const clampedEnd = end < antarEnd ? end : antarEnd;
    if (clampedEnd <= cursor) break;
    periods.push({
      lord,
      start: cursor.toISODate()!,
      end: clampedEnd.toISODate()!,
      level: "pratyantar",
    });
    cursor = clampedEnd;
    if (cursor >= antarEnd) break;
  }
  return periods;
}

/**
 * Build Vimshottari tree from birth (UTC) covering ~120 years.
 */
export function buildVimshottariTree(
  moonLongitude: number,
  birthUtcIso: string,
  cycles = 1
): { balanceDays: number; tree: DashaPeriod[] } {
  const birth = DateTime.fromISO(birthUtcIso, { zone: "utc" });
  const { lord: firstLord, balanceDays } = dashaBalanceAtBirth(moonLongitude);
  const order = nextLords(firstLord);
  const tree: DashaPeriod[] = [];
  let cursor = birth;

  for (let cycle = 0; cycle < cycles; cycle++) {
    for (let i = 0; i < order.length; i++) {
      const lord = order[i];
      const fullDays = dashaLengthDays(lord);
      const days = cycle === 0 && i === 0 ? balanceDays : fullDays;
      const end = cursor.plus({ days });
      const children = buildAntar(lord, cursor, end);
      tree.push({
        lord,
        start: cursor.toISODate()!,
        end: end.toISODate()!,
        level: "maha",
        children,
      });
      cursor = end;
    }
  }

  return { balanceDays, tree };
}

export function findCurrentDasha(
  tree: DashaPeriod[],
  atIso = DateTime.utc().toISODate()!
): {
  maha: DashaPeriod | null;
  antar: DashaPeriod | null;
  pratyantar: DashaPeriod | null;
} {
  const at = DateTime.fromISO(atIso);
  for (const maha of tree) {
    const ms = DateTime.fromISO(maha.start);
    const me = DateTime.fromISO(maha.end);
    if (at >= ms && at < me) {
      let antar: DashaPeriod | null = null;
      let pratyantar: DashaPeriod | null = null;
      for (const a of maha.children || []) {
        const as = DateTime.fromISO(a.start);
        const ae = DateTime.fromISO(a.end);
        if (at >= as && at < ae) {
          antar = a;
          for (const p of a.children || []) {
            const ps = DateTime.fromISO(p.start);
            const pe = DateTime.fromISO(p.end);
            if (at >= ps && at < pe) {
              pratyantar = p;
              break;
            }
          }
          break;
        }
      }
      return { maha, antar, pratyantar };
    }
  }
  return { maha: null, antar: null, pratyantar: null };
}

/**
 * Re-resolve current dasha against today's date without recomputing planets.
 * Mutates and returns the chart for convenience.
 */
export function refreshCurrentDasha(
  chart: import("@/lib/astrology/types").ChartPayload,
  asOfDate = DateTime.utc().toISODate()!
): import("@/lib/astrology/types").ChartPayload {
  const current = findCurrentDasha(chart.dasha.tree, asOfDate);
  chart.asOfDate = asOfDate;
  chart.overview.currentMaha = current.maha;
  chart.overview.currentAntar = current.antar;
  chart.overview.currentPratyantar = current.pratyantar;
  return chart;
}

export function nearTermWindow(asOfDate: string): { start: string; end: string } {
  const start = DateTime.fromISO(asOfDate);
  return {
    start: asOfDate,
    end: start.plus({ months: 12 }).toISODate()!,
  };
}
