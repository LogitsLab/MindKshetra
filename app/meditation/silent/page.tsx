import type { Metadata } from "next";
import SilentSitClient from "@/components/SilentSitClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Silent meditation timer",
  description:
    "A quiet timer with a start bell, optional interval bells, and an end bell. Presets from 5 to 45 minutes.",
  path: "/meditation/silent",
});

export default function SilentMeditationPage() {
  return (
    <div className="animate-fade">
      <SilentSitClient />
    </div>
  );
}
