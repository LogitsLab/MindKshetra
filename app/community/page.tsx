import type { Metadata } from "next";
import SanghaClient from "@/components/SanghaClient";
import { pageMetadata } from "@/lib/seo";
import { getSlokaByRef } from "@/lib/slokas";

export const metadata: Metadata = pageMetadata({
  title: "Community: practice together",
  description:
    "Practice together: a weekly live sit, channels, seva and a care path. Not a social feed.",
  path: "/community",
});

// Static: the page reads one verse through the content layer, whose no-store
// fetches otherwise render it per request.
export const dynamic = "force-static";
export const revalidate = 86400;

export default async function CommunityPage() {
  const microSeva = await getSlokaByRef(3, 21);
  const microSevaHref = microSeva ? `/sloka/${microSeva.id}` : "/explore/3";

  return (
    <div className="animate-fade">
      <SanghaClient microSevaHref={microSevaHref} />
    </div>
  );
}
