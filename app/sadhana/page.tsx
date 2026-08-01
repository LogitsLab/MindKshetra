import type { Metadata } from "next";
import { Suspense } from "react";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import SadhanaClient from "@/components/SadhanaClient";

export const metadata: Metadata = {
  title: "Sādhana · MindKshetra",
  description:
    "A short daily practice: meet your mind, sit with one Gita verse, and reflect.",
};

export default function SadhanaPage() {
  return (
    <div className="animate-fade">
      <LocalizedPageHeader eyebrowKey="sadhanaEyebrow" titleKey="sadhanaTitle" />
      {/* Suspense: SadhanaClient reads the path-day deep link via
          useSearchParams, which needs a boundary on a static page. */}
      <Suspense fallback={null}>
        <SadhanaClient />
      </Suspense>
    </div>
  );
}
