import { runs } from "@trigger.dev/sdk/v3";
import { markCancelled, getRunId } from "@/lib/jobs";

export const runtime = "nodejs";

// Cancel the Trigger.dev run (stops the compute on Trigger's infra), then flip
// the job to cancelled in Redis so the UI updates immediately. Done after the
// cancel so a late progress snapshot from the dying worker can't resurrect it.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const runId = await getRunId(id);
  if (runId) {
    try {
      await runs.cancel(runId);
    } catch (err) {
      console.error(`[cancel] runs.cancel failed for ${runId}`, err);
    }
  }

  await markCancelled(id);
  return Response.json({ ok: true });
}
