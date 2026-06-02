import { getRedis } from "./redis";
import {
  generateVariants,
  ProviderError,
  type ModelConfig,
} from "./providers";

export type JobStatus = "running" | "done" | "error" | "cancelled";

export interface JobState {
  id: string;
  status: JobStatus;
  model: string;
  provider: string;
  // Accumulated partial output so far (full snapshot, not a delta).
  text: string;
  // Reasoning-chunk count for the "thinking…" indicator.
  reasoning: number;
  createdAt: number;
  updatedAt: number;
  // Present once status === "done": { variants, meta }.
  result?: unknown;
  error?: string;
  errorStatus?: number;
}

const TTL_SECONDS = 3600;
const key = (id: string) => `psalter:job:${id}`;
// Stored in its own key so the worker's progress snapshots (which rebuild the
// JobState) never clobber it. The cancel endpoint reads it to cancel the run.
const runIdKey = (id: string) => `psalter:job:${id}:run`;

export async function readJob(id: string): Promise<JobState | null> {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<JobState>(key(id))) ?? null;
}

export async function writeJob(state: JobState): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(key(state.id), state, { ex: TTL_SECONDS });
}

export async function setRunId(id: string, runId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(runIdKey(id), runId, { ex: TTL_SECONDS });
}

export async function getRunId(id: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<string>(runIdKey(id))) ?? null;
}

// Flip a still-running job to cancelled (preserving any partial text). Won't
// clobber a job that already reached done/error. Lets the cancel endpoint
// update the UI immediately, without waiting on the worker's abort.
export async function markCancelled(id: string): Promise<void> {
  const job = await readJob(id);
  if (!job || job.status !== "running") return;
  await writeJob({ ...job, status: "cancelled", updatedAt: Date.now() });
}

interface RunParams {
  model: ModelConfig;
  systemPrompt: string;
  userPrompt: string;
  schema: object;
  createdAt: number;
}

// The decoupled worker. Runs the generation to completion regardless of any
// client connection, persisting throttled progress snapshots to Redis so the
// live SSE tail and the poll endpoint can read it. Cancellation is handled
// out-of-band by the cancel endpoint (it cancels the Trigger run, which stops
// this worker, and flips the status in Redis) — the worker has no cancel logic.
export async function runJob(id: string, params: RunParams): Promise<void> {
  const { model, systemPrompt, userPrompt, schema, createdAt } = params;
  let text = "";
  let reasoning = 0;
  let finished = false;
  let flushing = false;

  const snapshot = (status: JobStatus): JobState => ({
    id,
    status,
    model: model.id,
    provider: model.provider,
    text,
    reasoning,
    createdAt,
    updatedAt: Date.now(),
  });

  // Persist a progress snapshot every 500ms so the live view stays current.
  const tick = setInterval(async () => {
    if (finished || flushing) return;
    flushing = true;
    try {
      await writeJob(snapshot("running"));
    } catch {
      // Transient Redis hiccup — the next tick will retry.
    } finally {
      flushing = false;
    }
  }, 500);

  // Stop the ticker and wait for any in-flight snapshot to finish, so the
  // terminal write below is guaranteed to be the last one (no stale "running"
  // landing after "done"/"error").
  const finish = async () => {
    finished = true;
    clearInterval(tick);
    while (flushing) await new Promise((r) => setTimeout(r, 20));
  };

  try {
    const result = await generateVariants({
      model,
      systemPrompt,
      userPrompt,
      schema,
      onChunk: (delta) => {
        text += delta;
      },
      onReasoning: (count) => {
        reasoning = count;
      },
    });
    await finish();
    await writeJob({
      ...snapshot("done"),
      result: {
        ...(result.json as object),
        meta: {
          stop_reason: result.stopReason,
          usage: result.usage,
          provider: model.provider,
          elapsed_ms: Date.now() - createdAt,
        },
      },
    });
  } catch (err) {
    await finish();
    const message = err instanceof Error ? err.message : String(err);
    const errorStatus = err instanceof ProviderError ? err.status : 500;
    await writeJob({ ...snapshot("error"), error: message, errorStatus });
  }
}
