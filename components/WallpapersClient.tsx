"use client";

import Image from "next/image";
import ImmersiveHero from "@/components/ImmersiveHero";
import { useLanguage } from "@/components/LanguageProvider";
import catalog from "@/data/wallpapers.json";

type Wallpaper = {
  id: string;
  src: string;
  filename: string;
  titleEn: string;
  titleHi: string;
};

const wallpapers = catalog.wallpapers as Wallpaper[];

export default function WallpapersClient() {
  const { lang, t } = useLanguage();
  const hero = wallpapers[0];

  return (
    <div className="life-hub pb-10">
      <ImmersiveHero
        image={hero?.src ?? "/images/hero.jpg"}
        eyebrow={t("wallpapersEyebrow")}
        title={t("wallpapersTitle")}
        intro={t("wallpapersIntro")}
        meta={<p className="text-sm text-white/70">{t("wallpapersMeta")}</p>}
      />

      <section className="mt-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {wallpapers.map((wp) => {
            const title = lang === "hi" ? wp.titleHi : wp.titleEn;
            return (
              <article
                key={wp.id}
                className="overflow-hidden border border-[var(--line)] bg-[var(--panel)]"
              >
                <div className="relative aspect-[9/16] w-full bg-[var(--void)]">
                  <Image
                    src={wp.src}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <h2 className="font-display text-lg leading-snug text-[var(--text)]">
                    {title}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={wp.src}
                      download={wp.filename}
                      className="inline-flex min-h-10 items-center bg-[var(--brass)] px-4 py-2 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
                    >
                      {t("wallpapersDownload")}
                    </a>
                    <a
                      href={wp.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center border border-[var(--line)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)]"
                    >
                      {t("wallpapersOpen")}
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-8 max-w-2xl text-sm font-light text-[var(--text-muted)]">
          {t("wallpapersCredit")}
        </p>
      </section>
    </div>
  );
}
