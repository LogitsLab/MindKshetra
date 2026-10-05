import type { Metadata } from "next";
import PanchangView, {
  type DailyPanchang,
  type VotdPayload,
} from "@/components/PanchangView";
import { computeDailyPanchang } from "@/lib/astrology/daily-panchang";
import { festivalsForDailyPanchang } from "@/lib/astrology/festivals";
import { resolveIanaTz } from "@/lib/astrology/geo";
import { getVerseOfTheDaySelection } from "@/lib/day-seed";
import { localDayString } from "@/lib/practice-streaks";
import { pageMetadata } from "@/lib/seo";
import { formatVerseRef } from "@/lib/sloka-utils";

/**
 * Today's panchang is rendered here, on the server, for the same default sky
 * as /api/panchang (New Delhi). The page used to ship a heading and a loading
 * skeleton and fetch everything after hydration, so "today's panchang" had no
 * tithi or nakshatra in its HTML. Hourly ISR keeps it current: the date rolls
 * within an hour of IST midnight, and the client refetches if it lands on a
 * stale render. Needs ./ephemeris traced for this route (next.config.mjs),
 * or it would silently compute under Moshier.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;

export const metadata: Metadata = pageMetadata({
  title: "Today's Panchang (Aaj Ka Panchang): tithi, nakshatra, yoga",
  description:
    "Today's tithi, nakshatra, yoga, karana and vaar with sunrise and sunset, computed from the Swiss Ephemeris at local sunrise.",
  path: "/panchang",
});

function todaysPanchang(): DailyPanchang | null {
  try {
    const ianaTz = resolveIanaTz(DEFAULT_LAT, DEFAULT_LNG);
    const date = localDayString(ianaTz, new Date());
    const panchang = computeDailyPanchang(date, DEFAULT_LAT, DEFAULT_LNG, ianaTz);
    return {
      ...panchang,
      festivals: festivalsForDailyPanchang(panchang, DEFAULT_LAT, DEFAULT_LNG),
    };
  } catch (err) {
    console.warn(
      "[panchang] server render failed, client will fetch:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function todaysVerse(): Promise<VotdPayload | null> {
  try {
    const selection = await getVerseOfTheDaySelection();
    if (!selection) return null;
    const { sloka } = selection;
    return {
      id: sloka.id,
      ref: formatVerseRef(sloka),
      // Only what the verse card renders; the full row carries commentary.
      sloka: {
        chapter: sloka.chapter,
        verse_number: sloka.verse_number,
        sanskrit_devanagari: sloka.sanskrit_devanagari,
        english_translation: sloka.english_translation,
        hindi_translation: sloka.hindi_translation,
      },
    };
  } catch {
    return null;
  }
}

export default async function PanchangPage() {
  const [initialPanchang, initialVotd] = await Promise.all([
    Promise.resolve(todaysPanchang()),
    todaysVerse(),
  ]);
  return (
    <div className="animate-fade">
      <PanchangView initialPanchang={initialPanchang} initialVotd={initialVotd} />
    </div>
  );
}
