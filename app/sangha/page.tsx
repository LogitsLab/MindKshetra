import type { Metadata } from "next";
import LocalizedPageHeader from "@/components/LocalizedPageHeader";
import SanghaClient from "@/components/SanghaClient";
import { getSlokaByRef } from "@/lib/slokas";

export const metadata: Metadata = {
  title: "Sangha · MindKshetra",
  description:
    "Practice together — weekly live, channels, seva, and a care path. Not a social feed.",
};

export default async function SanghaPage() {
  const microSeva = await getSlokaByRef(3, 21);
  const microSevaHref = microSeva ? `/sloka/${microSeva.id}` : "/explore/3";

  return (
    <div className="animate-fade">
      <LocalizedPageHeader
        eyebrowKey="sanghaEyebrow"
        titleKey="sanghaTitle"
        introKey="sanghaIntro"
      />
      <SanghaClient microSevaHref={microSevaHref} />
    </div>
  );
}
