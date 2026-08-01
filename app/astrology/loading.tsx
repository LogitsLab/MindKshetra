import Skeleton, { SkeletonPanel } from "@/components/Skeleton";

/**
 * Astrology is the slowest route in the app: the ephemeris load and the chart
 * computation both land before first paint. The root `app/loading.tsx` shows a
 * bare progress bar, which over a multi-second wait reads as a stall.
 *
 * Traces the landing's real shape — eyebrow, display title, tagline, then the
 * cast form — so nothing jumps when the page arrives. English label: this is a
 * server component, so the language toggle is not readable here (same
 * constraint the root loading.tsx already lives with).
 */
export default function AstrologyLoading() {
  return (
    <div className="animate-fade py-12 sm:py-16" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="max-w-3xl">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-6 h-12 w-3/4 sm:h-16" />
        <Skeleton className="mt-5 h-6 w-1/2" />
        <Skeleton className="mt-4 h-4 w-2/3" />
        <div className="mt-9 flex gap-3">
          <Skeleton block className="h-11 w-36" />
          <Skeleton block className="h-11 w-32" />
        </div>
      </div>
      <div className="mt-16 max-w-3xl border-t border-[var(--brass)]/20 pt-12">
        <SkeletonPanel widths={["w-40", "w-full", "w-2/3", "w-1/3"]} />
      </div>
    </div>
  );
}
