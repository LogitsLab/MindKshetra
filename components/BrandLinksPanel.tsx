"use client";

import { brandLinks, type BrandLink } from "@/lib/brand-links";
import { useLanguage } from "@/components/LanguageProvider";
import { trackMeta } from "@/lib/meta-pixel";

function labelFor(link: BrandLink, lang: string): string {
  return lang === "hi" ? link.labelHi : link.labelEn;
}

/**
 * Compact Follow-us list for Community / Account. External destinations only.
 */
export default function BrandLinksPanel({
  whatsapp,
  includeStores = false,
  className = "",
}: {
  whatsapp?: string | null;
  includeStores?: boolean;
  className?: string;
}) {
  const { lang, t } = useLanguage();
  const links = brandLinks({ whatsapp: whatsapp ?? undefined, includeStores });

  return (
    <section className={className}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--brass-soft)]">
        {t("sanghaFollowUs")}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-sm text-[var(--text)] transition hover:text-[var(--brass-soft)]"
              onClick={() => {
                if (link.id === "whatsapp") trackMeta("JoinCommunity");
                if (link.id === "appStore" || link.id === "playStore") {
                  trackMeta("StoreClick", { store: link.id });
                }
              }}
            >
              {labelFor(link, lang)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
