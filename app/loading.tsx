export default function Loading() {
  return (
    <div
      className="flex min-h-[42vh] flex-col items-center justify-center gap-4 animate-fade"
      role="status"
      aria-live="polite"
    >
      <span
        className="nav-progress-indeterminate block h-[2px] w-28 rounded-full bg-[var(--brass)]/70"
        aria-hidden
      />
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
        Loading…
      </p>
    </div>
  );
}
