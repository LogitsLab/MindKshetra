import type { Metadata } from "next";
import PanchangCalendarView from "@/components/PanchangCalendarView";

export const metadata: Metadata = {
  title: "Panchang calendar · MindKshetra",
  description:
    "Month view of tithi and nakshatra — same Swiss Ephemeris as today’s panchang.",
};

export default function PanchangCalendarPage() {
  return (
    <div className="animate-fade">
      <PanchangCalendarView />
    </div>
  );
}
