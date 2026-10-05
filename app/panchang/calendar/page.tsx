import type { Metadata } from "next";
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
      <PanchangCalendarView />
    </div>
  );
}
