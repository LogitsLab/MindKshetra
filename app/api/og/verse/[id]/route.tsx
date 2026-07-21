import { ImageResponse } from "@vercel/og";
import { getSlokaById } from "@/lib/slokas";

export const runtime = "edge";

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
  const sanskrit = sloka.sanskrit_devanagari.slice(0, 120);
  const english = sloka.english_translation.slice(0, 180);

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
        <div style={{ fontSize: 28, color: "#c9a227" }}>MindKshetra · {ref}</div>
        <div style={{ fontSize: 36, lineHeight: 1.4, textAlign: "center" }}>
          {sanskrit}
        </div>
        <div style={{ fontSize: 22, lineHeight: 1.5, color: "#9aa8bc" }}>
          {english}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
