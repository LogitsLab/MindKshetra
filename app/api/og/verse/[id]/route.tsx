import { ImageResponse } from "@vercel/og";
import { truncatePreview } from "@/lib/sloka-utils";
import { getSlokaById } from "@/lib/slokas";
import { versePopularName } from "@/lib/verse-names";
export const runtime = "nodejs";

/**
 * Verse share cards.
 * - default: 1200×630 link preview
 * - ?format=stories: 1080×1920 Instagram/WhatsApp Stories
 * Pass ?nakshatra= for a tithi/nakshatra chip on Stories cards.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const sloka = await getSlokaById(id);
  if (!sloka) {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const stories = searchParams.get("format") === "stories";
  const width = stories ? 1080 : 1200;
  const height = stories ? 1920 : 630;

  const ref = `${sloka.chapter}.${sloka.verse_number}`;
  const name = versePopularName(sloka.chapter, sloka.verse_number);
  const transliteration = truncatePreview(
    sloka.transliteration_iast ?? "",
    stories ? 160 : 130
  );
  const english = truncatePreview(
    sloka.english_translation ?? "",
    stories ? 220 : 180
  );

  const nakshatra = searchParams.get("nakshatra")?.trim() || "";

  const pad = stories ? 72 : 48;
  const titleSize = stories ? 36 : 28;
  const verseSize = stories ? 44 : 36;
  const bodySize = stories ? 28 : 22;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: stories
            ? "linear-gradient(165deg, #0e1420 0%, #1a1520 48%, #0e1420 100%)"
            : "#0e1420",
          color: "#eef2f7",
          padding: pad,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: titleSize, color: "#c9a227" }}>
            {`Bhagavad Gita ${ref}${name ? ` · ${name}` : ""}`}
          </div>
          {nakshatra ? (
            <div
              style={{
                display: "flex",
                fontSize: stories ? 24 : 18,
                color: "#9aa8bc",
                letterSpacing: 2,
              }}
            >
              {nakshatra}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            fontSize: verseSize,
            lineHeight: 1.45,
            textAlign: "center",
            paddingTop: stories ? 48 : 0,
            paddingBottom: stories ? 48 : 0,
          }}
        >
          {transliteration}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: bodySize,
              lineHeight: 1.5,
              color: "#9aa8bc",
            }}
          >
            {english}
          </div>
          <div style={{ display: "flex", fontSize: stories ? 24 : 20, color: "#c9a227" }}>
            mindkshetra.in
          </div>
        </div>
      </div>
    ),
    { width, height }
  );
}
