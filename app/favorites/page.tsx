import type { Metadata } from "next";
import FavoritesPageClient from "@/components/FavoritesPageClient";
import { NOINDEX } from "@/lib/seo";

export const metadata: Metadata = { ...NOINDEX, title: "Favorites" };

export default function FavoritesPage() {
  return <FavoritesPageClient />;
}
