import type { Metadata } from "next";
import { sleepTracks } from "@/lib/meditation-audio";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Meditation audio credits",
  description: "Public-domain sleep beds used in MindKshetra, with sources.",
  path: "/meditation/credits",
});

export default function MeditationCreditsPage() {
  const tracks = sleepTracks();
  return (
    <div className="animate-fade mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl">Audio credits</h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        Sleep beds are HoliznaCC0, dedicated to the public domain under CC0 1.0.
        Sitting-course bells, drone, bowls, and rain are original beds shipped with the app.
      </p>
      <ul className="mt-8 space-y-4">
        {tracks.map((track) => (
          <li key={track.id}>
            <p className="text-[var(--text)]">{track.title_en}</p>
            <p className="text-sm text-[var(--text-muted)]">
              {track.credit} · {track.license}
            </p>
            <a href={track.sourceUrl} className="text-sm text-[var(--brass-soft)]">
              {track.sourceUrl}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
