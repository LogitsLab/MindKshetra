import type { Metadata } from "next";
import PranayamaClient from "@/components/PranayamaClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Prāṇāyāma — guided breath",
  description:
    "Box, 4-7-8, or even breath for a few minutes. Follow the ring and log your practice.",
  path: "/pranayama",
});

export default function PranayamaPage() {
  return (
    <div className="animate-fade">
      <PranayamaClient />
    </div>
  );
}