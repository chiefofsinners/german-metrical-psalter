import { NextResponse } from "next/server";
import { getPsalm } from "@/lib/psalms";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ n: string }> }
) {
  const { n } = await params;
  const psalm = Number(n);
  const verses = getPsalm(psalm);
  if (!verses) {
    return NextResponse.json({ error: `Psalm ${n} not found` }, { status: 404 });
  }
  return NextResponse.json({ psalm, verses });
}
