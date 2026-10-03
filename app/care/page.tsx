import type { Metadata } from "next";
import CareClient from "@/components/CareClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Mental health helplines in India",
  description:
    "Free starting-point helplines in India, including tele-MANAS (14416). MindKshetra is a Gita companion, not clinical care.",
  path: "/care",
});

export default function CarePage() {
  return (
    <div className="animate-fade">
      <CareClient />
    </div>
  );
}
