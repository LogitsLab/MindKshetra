import { DateTime } from "luxon";
import {
  NAKSHATRAS,
  longitudeToNakshatra,
  longitudeToSign,
} from "@/lib/astrology/signs";
import type { SignId } from "@/lib/astrology/types";

export type BirthPanchang = {
  tithi: string;
  tithiIndex: number;
  nakshatra: string;
  pada: number;
  yoga: string;
  yogaIndex: number;
  karana: string;
  vaar: string;
  vaarIndex: number;
};

const TITHIS = [
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
  "Purnima",
  "Pratipada",
  "Dwitiya",
  "Tritiya",
  "Chaturthi",
  "Panchami",
  "Shashthi",
  "Saptami",
  "Ashtami",
  "Navami",
  "Dashami",
  "Ekadashi",
  "Dwadashi",
  "Trayodashi",
  "Chaturdashi",
  "Amavasya",
];

const YOGAS = [
  "Vishkambha",
  "Priti",
  "Ayushman",
  "Saubhagya",
  "Shobhana",
  "Atiganda",
  "Sukarma",
  "Dhriti",
  "Shula",
  "Ganda",
  "Vriddhi",
  "Dhruva",
  "Vyaghata",
  "Harshana",
  "Vajra",
  "Siddhi",
  "Vyatipata",
  "Variyan",
  "Parigha",
  "Shiva",
  "Siddha",
  "Sadhya",
  "Shubha",
  "Shukla",
  "Brahma",
  "Indra",
  "Vaidhriti",
];

const KARANAS = [
  "Bava",
  "Balava",
  "Kaulava",
  "Taitila",
  "Gara",
  "Vanija",
  "Vishti",
  "Shakuni",
  "Chatushpada",
  "Naga",
  "Kimstughna",
];

const VAARS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function norm(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

/**
 * Classical panchang elements from Sun/Moon sidereal longitudes + birth UTC.
 */
export function computeBirthPanchang(
  sunLon: number,
  moonLon: number,
  utcIso: string
): BirthPanchang {
  const sun = norm(sunLon);
  const moon = norm(moonLon);
  const elongation = norm(moon - sun);

  const tithiIndex = Math.floor(elongation / 12); // 0–29
  const tithiName =
    tithiIndex < 15
      ? `Shukla ${TITHIS[tithiIndex]}`
      : `Krishna ${TITHIS[tithiIndex]}`;

  const nak = longitudeToNakshatra(moon);

  const yogaIndex = Math.floor(norm(sun + moon) / (360 / 27)) % 27;
  const yoga = YOGAS[yogaIndex];

  // Karana: half-tithi (6°). Fixed karanas at ends of month.
  const karanaSlot = Math.floor(elongation / 6); // 0–59
  let karana: string;
  if (karanaSlot === 0) karana = KARANAS[10]; // Kimstughna
  else if (karanaSlot >= 57) karana = KARANAS[7 + (karanaSlot - 57)]; // Shakuni…Naga
  else karana = KARANAS[(karanaSlot - 1) % 7];

  const dt = DateTime.fromISO(utcIso, { zone: "utc" });
  // Luxon weekday: 1=Mon … 7=Sun → convert to Sunday=0
  const vaarIndex = dt.weekday === 7 ? 0 : dt.weekday;

  return {
    tithi: tithiName,
    tithiIndex,
    nakshatra: nak.nakshatra || NAKSHATRAS[nak.nakshatraIndex],
    pada: nak.pada,
    yoga,
    yogaIndex,
    karana,
    vaar: VAARS[vaarIndex],
    vaarIndex,
  };
}

export function sunSignLabel(sunLon: number): SignId {
  return longitudeToSign(sunLon).sign;
}
