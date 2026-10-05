import type { Metadata } from "next";
import WallpapersClient from "@/components/WallpapersClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Krishna, Shiva, Rama and Hanuman phone wallpapers",
  description:
    "Free devotional phone wallpapers of Krishna, Shiva, Rama, Hanuman and Kurukshetra for your lock screen, from MindKshetra.",
  path: "/wallpapers",
});

export default function WallpapersPage() {
  return (
    <div className="animate-fade">
      <WallpapersClient />
    </div>
  );
}
