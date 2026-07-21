import type { MetadataRoute } from "next";
import { getAllMoods } from "@/lib/moods";
import { getAllSlokas, getChapters } from "@/lib/slokas";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${site}/explore`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${site}/mood`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${site}/madhav`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${site}/verse-of-the-day`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${site}/favorites`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  const chapters = (await getChapters()).map((n) => ({
    url: `${site}/explore/${n}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const moods = (await getAllMoods()).map((m) => ({
    url: `${site}/mood/${m.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const slokas = (await getAllSlokas()).map((s) => ({
    url: `${site}/sloka/${s.id}`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...chapters, ...moods, ...slokas];
}
