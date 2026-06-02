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
const cancelKey = (id: string) => `psalter:job:${id}:cancel`;

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

export async function requestCancel(id: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(cancelKey(id), "1", { ex: TTL_SECONDS });
}

async function isCancelRequested(id: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  return Boolean(await redis.get(cancelKey(id)));
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
// live SSE tail and the poll endpoint can read it. Cancellation is cooperative:
// a flag in Redis is polled and aborts the model request.
export async function runJob(id: string, params: RunParams): Promise<void> {
  const { model, systemPrompt, userPrompt, schema, createdAt } = params;
  const controller = new AbortController();
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

  // Periodically persist progress and check for a cancel request. One SET + one
  // GET per tick keeps Redis traffic modest while staying ~live.
  const tick = setInterval(async () => {
    if (finished || flushing) return;
    flushing = true;
    try {
      await writeJob(snapshot("running"));
      if (await isCancelRequested(id)) controller.abort();
    } catch {
      // Transient Redis hiccup — the next tick will retry.
    } finally {
      flushing = false;
    }
  }, 500);

  try {
    const result = await generateVariants({
      model,
      systemPrompt,
      userPrompt,
      schema,
      signal: controller.signal,
      onChunk: (delta) => {
        text += delta;
      },
      onReasoning: (count) => {
        reasoning = count;
      },
    });
    finished = true;
    clearInterval(tick);
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
    finished = true;
    clearInterval(tick);
    if (controller.signal.aborted) {
      await writeJob(snapshot("cancelled"));
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    const errorStatus = err instanceof ProviderError ? err.status : 500;
    await writeJob({ ...snapshot("error"), error: message, errorStatus });
  } finally {
    clearInterval(tick);
  }
}
