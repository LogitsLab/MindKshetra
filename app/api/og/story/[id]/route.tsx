import { ImageResponse } from "@vercel/og";
import { getSlokaById } from "@/lib/slokas";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const sloka = await getSlokaById(id);
  if (!sloka) {
    return new Response("Not found", { status: 404 });
  }

  const lang = new URL(request.url).searchParams.get("lang") === "hi" ? "hi" : "en";
  const ref = `${sloka.chapter}.${sloka.verse_number}`;
  const excerpt = (
    lang === "hi" ? sloka.hindi_translation : sloka.english_translation
  ).slice(0, 280);

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
        <div style={{ fontSize: 28, color: "#c9a227" }}>
          MindKshetra · {ref} reflection
        </div>
        <div style={{ fontSize: 26, lineHeight: 1.55, color: "#eef2f7" }}>
          {excerpt}
        </div>
        <div style={{ fontSize: 20, color: "#9aa8bc" }}>
          A modern story from the Gita
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
