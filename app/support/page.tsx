import type { Metadata } from "next";
import SupportClient from "@/components/SupportClient";

export const metadata: Metadata = {
  title: "Support · MindKshetra",
  description:
    "MindKshetra is free forever. Dāna keeps it that way for everyone and funds free access for students.",
};

export default function SupportPage() {
  return (
    <div className="animate-fade">
      <SupportClient />
    </div>
  );
}
