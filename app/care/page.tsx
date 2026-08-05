import type { Metadata } from "next";
import CareClient from "@/components/CareClient";

export const metadata: Metadata = {
  title: "Care · MindKshetra",
  description:
    "Starting-point helplines in India. MindKshetra is a Gita companion, not clinical care.",
};

export default function CarePage() {
  return (
    <div className="animate-fade">
      <CareClient />
    </div>
  );
}
