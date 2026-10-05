import { ImageResponse } from "@vercel/og";
import { truncatePreview } from "@/lib/sloka-utils";
import { getSlokaById } from "@/lib/slokas";
import { versePopularName } from "@/lib/verse-names";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const sloka = await getSlokaById(id);
  if (!sloka) {
    return new Response("Not found", { status: 404 });
  }

  const ref = `${sloka.chapter}.${sloka.verse_number}`;
  const name = versePopularName(sloka.chapter, sloka.verse_number);
  // IAST, not Devanagari: Satori has no Indic shaping, so the Devanagari came
  // out with broken conjuncts (visible halants, misplaced i-mātrā) — a
  // misspelled verse on every share of a scripture site. Latin with
  // diacritics renders correctly.
  const transliteration = truncatePreview(sloka.transliteration_iast ?? "", 130);
  const english = truncatePreview(sloka.english_translation ?? "", 180);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e1420",
          color: "#eef2f7",
          padding: 48,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#c9a227" }}>
          {`Bhagavad Gita ${ref}${name ? ` · ${name}` : ""}`}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 36,
            lineHeight: 1.4,
            textAlign: "center",
            justifyContent: "center",
          }}
        >
          {transliteration}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            lineHeight: 1.5,
            color: "#9aa8bc",
          }}
        >
          {english}
        </div>
        <div style={{ display: "flex", fontSize: 20, color: "#c9a227" }}>
          mindkshetra.in
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
