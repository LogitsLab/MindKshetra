import Skeleton, { SkeletonPanel } from "@/components/Skeleton";

/**
 * Panchang recomputes tithi, nakshatra, yoga and karana from the Swiss
 * Ephemeris at local sunrise, so it is never instant.
 *
 * Mirrors the page: hero band, header, then the panel `PanchangView` fills.
 * The bands are sized to the real elements — a skeleton whose proportions lie
 * is a layout shift with extra steps.
 */
export default function PanchangLoading() {
  return (
    <div className="animate-fade" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <Skeleton block className="mb-8 h-36 max-w-2xl sm:h-44" />
      <div className="mb-8 max-w-2xl">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-9 w-1/2" />
      </div>
      <SkeletonPanel />
    </div>
  );
}
