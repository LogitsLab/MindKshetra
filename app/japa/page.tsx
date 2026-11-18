import type { Metadata } from "next";
import JapaPageClient from "@/components/JapaPageClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Japa — mantra on the mala",
  description:
    "Choose a mantra, set your count, and tap the circle. Assisted chant or silent self-paced japa.",
  path: "/japa",
});

export default function JapaPage() {
  return (
    <div className="animate-fade">
      <JapaPageClient />
    </div>
  );
}