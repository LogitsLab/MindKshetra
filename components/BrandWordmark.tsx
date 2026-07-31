/** Product name + studio credit lockups. Credit is header-only. */

export const BRAND_NAME = "MindKshetra";
export const BRAND_CREDIT = "by LogitsLab";

/**
 * Header lockup: stacked name + credit, right-aligned so
 * "LogitsLab" and "Kshetra" share the same trailing edge.
 */
export function BrandNavWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex min-w-0 flex-col items-end leading-none ${className}`}
    >
      <span className="truncate">{BRAND_NAME}</span>
      <span className="mt-0.5 whitespace-nowrap text-[0.55em] font-normal tracking-wide text-[var(--text-muted)]">
        {BRAND_CREDIT}
      </span>
    </span>
  );
}
