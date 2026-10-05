import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo";

/** Per-user page: kept out of the index, links still followed. */
export const metadata: Metadata = { ...NOINDEX, title: "Private chart" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
