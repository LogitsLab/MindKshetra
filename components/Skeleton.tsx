/**
 * The loading placeholder, as one primitive.
 *
 * Four surfaces had each hand-rolled this — `animate-pulse` on a `.surface`
 * wrapper, `bg-[var(--hairline)]` bars inside, a different set of widths every
 * time — and not one of them announced anything, so assistive tech heard
 * silence between the click and the content.
 *
 * Deliberately presentational and deliberately small: it draws a shape, it does
 * not fetch, decide, or time anything. `prefers-reduced-motion` already kills
 * the pulse through the wildcard in globals.css, so nothing needs registering.
 *
 * A skeleton is a promise about layout. Only use one where the real content
 * will land at roughly this size — otherwise it is a jump-cut with extra steps,
 * and `EmptyState` or a plain label is the honest choice.
 */
export default function Skeleton({
  className = "h-4 w-full",
  block = false,
}: {
  /** Sizing utilities for this shape, e.g. `"h-4 w-40"`. */
  className?: string;
  /** Draw a bordered control (a button, a chip) rather than a bar of text. */
  block?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse ${
        block
          ? "border border-[var(--line)] bg-[var(--surface)]"
          : "bg-[var(--hairline)]"
      } ${className}`}
    />
  );
}

/**
 * The panel shape the four surfaces were each rebuilding: a `.surface` card
 * holding a few staggered bars.
 *
 * `role="status"` + a screen-reader label is the part every hand-rolled copy
 * was missing.
 */
export function SkeletonPanel({
  widths = ["w-40", "w-56", "w-48"],
  label,
  className = "",
}: {
  /** One width utility per bar; the count sets the height of the block. */
  widths?: string[];
  /**
   * Announced to assistive tech, e.g. `t("loading")`. Omit when an ancestor
   * already carries the live region — two nested `role="status"` nodes get
   * read out twice.
   */
  label?: string;
  className?: string;
}) {
  return (
    <div
      role={label ? "status" : undefined}
      aria-live={label ? "polite" : undefined}
      className={`surface px-6 py-10 ${className}`}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      {widths.map((w, i) => (
        <Skeleton key={i} className={`h-4 ${w} ${i > 0 ? "mt-4" : ""}`} />
      ))}
    </div>
  );
}
