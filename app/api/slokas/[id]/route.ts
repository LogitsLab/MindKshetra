import { NextResponse } from "next/server";
import { getSlokaById } from "@/lib/slokas";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sloka = getSlokaById(id);
  if (!sloka) {
    return NextResponse.json({ error: "Sloka not found" }, { status: 404 });
  }

  return NextResponse.json(sloka);
}
