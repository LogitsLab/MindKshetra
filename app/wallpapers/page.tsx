import type { Metadata } from "next";
import WallpapersClient from "@/components/WallpapersClient";

export const metadata: Metadata = {
  title: "Wallpapers · MindKshetra",
  description:
    "Free phone wallpapers from MindKshetra — portrait stills for your lock screen.",
};

export default function WallpapersPage() {
  return (
    <div className="animate-fade">
      <WallpapersClient />
    </div>
  );
}
