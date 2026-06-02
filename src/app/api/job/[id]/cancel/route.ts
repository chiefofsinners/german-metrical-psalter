import { requestCancel } from "@/lib/jobs";

export const runtime = "nodejs";

// Explicit cancel: sets a flag the background worker polls and acts on by
// aborting the model request. Decoupled from any connection, unlike the old
// connection-drop cancellation.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await requestCancel(id);
  return Response.json({ ok: true });
}
