import type { MetadataRoute } from "next";
import { listJourneysByKind } from "@/lib/journeys/content";
import { getAllMoods } from "@/lib/moods";
import { CONTENT_LAST_MODIFIED } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { getAllSlokas, getChapters } from "@/lib/slokas";

// Enumerates all 701 verse URLs; without revalidate every crawler hit
// reloaded the full corpus. force-static because the content layer's DB
// fetches are no-store, which would otherwise keep this dynamic.
export const dynamic = "force-static";
export const revalidate = 86400;

/** IST calendar day: the verse of the day rotates at IST midnight. */
function istToday(): string {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Only indexable, server-rendered destinations belong here. Per-user shells
 * (favorites, journal, account) and the delete-account form are noindexed,
 * and tool pages that need a chart to show anything stay out until they carry
 * server-rendered copy of their own.
 *
 * `lastModified` is a real content date, never `new Date()`: stamping every
 * URL with the regeneration time taught crawlers to ignore the field.
 * changefreq/priority are omitted — Google ignores both.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = istToday();

  const daily = ["/", "/verse-of-the-day", "/panchang"].map((path) => ({
    url: absoluteUrl(path),
    lastModified: today,
  }));

  const hubs = [
    "/explore",
    "/mood",
    "/madhav",
    "/astrology",
    "/paths",
    "/meditation",
    "/sadhana",
    "/wallpapers",
    "/community",
    "/care",
    "/support",
    "/privacy",
  ].map((path) => ({ url: absoluteUrl(path), lastModified: CONTENT_LAST_MODIFIED }));

  const paths = listJourneysByKind("scripture").map((journey) => ({
    url: absoluteUrl(`/paths/${journey.id}`),
    lastModified: CONTENT_LAST_MODIFIED,
  }));

  const chapters = (await getChapters()).map((n) => ({
    url: absoluteUrl(`/explore/${n}`),
    lastModified: CONTENT_LAST_MODIFIED,
  }));

  const moods = (await getAllMoods()).map((m) => ({
    url: absoluteUrl(`/mood/${m.id}`),
    lastModified: CONTENT_LAST_MODIFIED,
  }));

  const slokas = (await getAllSlokas()).map((s) => ({
    url: absoluteUrl(`/sloka/${s.id}`),
    lastModified: CONTENT_LAST_MODIFIED,
  }));

  return [...daily, ...hubs, ...paths, ...chapters, ...moods, ...slokas];
}
