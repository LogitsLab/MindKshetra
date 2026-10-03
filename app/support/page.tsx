import type { Metadata } from "next";
import SupportClient from "@/components/SupportClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Support MindKshetra",
  description:
    "MindKshetra is free forever, with no ads. Dāna keeps it that way for everyone and funds free access for students.",
  path: "/support",
});

export default function SupportPage() {
  return (
    <div className="animate-fade">
      <SupportClient />
    </div>
  );
}
