/**
 * Server-rendered lead copy for chart/location tool hubs.
 * Gives crawlers indexable substance while the interactive client loads below.
 */
export default function AstrologyToolIntro({
  eyebrow,
  title,
  body,
  bullets,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
}) {
  return (
    <header className="mx-auto max-w-2xl px-4 pb-8 pt-10 text-center sm:pt-14">
      <p className="eyebrow text-[var(--brass)]">{eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl text-[var(--text)] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
        {body}
      </p>
      {bullets && bullets.length > 0 ? (
        <ul className="mt-5 space-y-2 text-left text-sm font-light text-[var(--text-soft)]">
          {bullets.map((line) => (
            <li key={line} className="border-l border-[var(--brass)]/40 pl-3">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
