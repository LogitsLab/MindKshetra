import { existsSync } from "fs";
import path from "path";
import Image from "next/image";

/**
 * Quiet top-of-page hero band (WS1): small, inside the content column, a
 * `--line` container — never full-bleed, never behind text. Server component
 * on purpose: it checks the public/ file at render time and renders nothing
 * when the image is absent, so pages can be wired before their asset lands
 * (the binaries ship separately from this code).
 */
export default function PageHeroImage({
  src,
  className = "",
}: {
  /** Public path, e.g. "/images/paths/sadhana.jpg". */
  src: string;
  className?: string;
}) {
  if (!existsSync(path.join(process.cwd(), "public", src))) return null;

  return (
    <div
      className={`relative mb-8 h-36 max-w-2xl overflow-hidden border border-[var(--line)] sm:h-44 ${className}`}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 672px"
        className="object-cover opacity-80"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[var(--media-scrim)] via-transparent to-transparent"
        aria-hidden
      />
    </div>
  );
}
