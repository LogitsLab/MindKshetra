import type { Metadata } from "next";
import AstrologyToolIntro from "@/components/AstrologyToolIntro";
import PanchangCalendarView from "@/components/PanchangCalendarView";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Panchang calendar: tithi and nakshatra by month",
  description:
    "Month view of tithi, nakshatra and Gita festivals, computed with the Swiss Ephemeris at local sunrise. Tap any day for its full panchang.",
  path: "/panchang/calendar",
});

export default function PanchangCalendarPage() {
  return (
    <div className="animate-fade">
      <AstrologyToolIntro
        eyebrow="Panchang calendar"
        title="Tithi and nakshatra by month"
        body="A month grid of Vedic calendar marks — tithi, nakshatra, and festival days tied to the Gita — computed with the Swiss Ephemeris at local sunrise. Open any day for the full daily panchang."
        bullets={[
          "Browse the month; tap through to today's detailed panchang.",
          "Festival marks include Ekadashi and named observances when present.",
          "Companion to /panchang — not a substitute for lived practice.",
        ]}
      />
      <PanchangCalendarView />
    </div>
  );
}