import type { Metadata } from "next";
import SadhanaClient from "@/components/SadhanaClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Daily sādhana: a Gita verse, a short sit and japa",
  description:
    "A short daily practice: check in with your mind, sit with one Bhagavad Gita verse, count a japa mala and write one honest line.",
  path: "/sadhana",
});

export default function SadhanaPage() {
  return (
    <div className="animate-fade">
      {/* No Suspense here: SadhanaClient reads the path-day deep link inside
          its own small boundary, so the practice renders on the server. */}
      <SadhanaClient />
    </div>
  );
}
