import { readJob } from "@/lib/jobs";

export const runtime = "nodejs";

// Poll endpoint: returns the current job snapshot. Reconnect-safe — the client
// falls back to this if the live SSE drops, and resumes from it after a reload.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await readJob(id);
  if (!job) {
    return Response.json({ error: "job not found" }, { status: 404 });
  }
  return Response.json(job);
}
