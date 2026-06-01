import { NextRequest } from "next/server";
import { getPsalm } from "@/lib/psalms";
import { SYSTEM_PROMPT, buildUserPrompt, OUTPUT_SCHEMA } from "@/lib/prompt";
import {
  findModel,
  generateVariants,
  ProviderError,
  MODELS,
  discoverLMStudioModels,
} from "@/lib/providers";

export const runtime = "nodejs";
// Vercel Pro + Fluid Compute ceiling. Classic serverless caps at 300; deploy
// will fail if Fluid Compute isn't enabled on the project.
export const maxDuration = 800;

function sseResponse(status: number, body: object): Response {
  const encoder = new TextEncoder();
  return new Response(
    encoder.encode(`data: ${JSON.stringify(body)}\n\n`),
    {
      status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  let body: {
    psalm?: number;
    variants?: number;
    model?: string;
    systemPrompt?: string;
  };
  try {
    body = await req.json();
  } catch {
    return sseResponse(400, { type: "error", message: "Invalid JSON body" });
  }

  const psalm = Number(body.psalm);
  const variants = Number(body.variants ?? 3);
  const modelId = body.model ?? "claude-sonnet-4-6";
  // Client may override the system prompt (editable in the UI). Fall back to
  // the bundled default for empty/missing values.
  const systemPrompt =
    typeof body.systemPrompt === "string" && body.systemPrompt.trim()
      ? body.systemPrompt
      : SYSTEM_PROMPT;

  if (!Number.isInteger(psalm) || psalm < 1 || psalm > 150) {
    return sseResponse(400, {
      type: "error",
      message: "psalm must be an integer between 1 and 150",
    });
  }
  if (!Number.isInteger(variants) || variants < 1 || variants > 5) {
    return sseResponse(400, {
      type: "error",
      message: "variants must be an integer between 1 and 5",
    });
  }
  let model = findModel(modelId);
  if (!model) {
    // Maybe it's a model currently loaded in LM Studio.
    const local = await discoverLMStudioModels();
    model = local.find((m) => m.id === modelId);
  }
  if (!model) {
    return sseResponse(400, {
      type: "error",
      message: `unknown model "${modelId}". Known: ${MODELS.map((m) => m.id).join(", ")}`,
    });
  }

  const hebrew = getPsalm(psalm);
  if (!hebrew) {
    return sseResponse(404, {
      type: "error",
      message: `Psalm ${psalm} not found`,
    });
  }

  console.log(
    `[generate] psalm=${psalm} variants=${variants} verses=${hebrew.length} model=${model.id}`
  );
  const t0 = Date.now();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      send({ type: "start", model: model.id, provider: model.provider });

      // Heartbeat every 10s so the connection doesn't appear dead while a
      // reasoning model is silently thinking before its first token.
      const heartbeat = setInterval(() => {
        send({ type: "heartbeat", elapsed: Date.now() - t0 });
      }, 10_000);

      try {
        const result = await generateVariants({
          model,
          systemPrompt,
          userPrompt: buildUserPrompt(psalm, hebrew, variants),
          schema: OUTPUT_SCHEMA,
          onChunk: (delta) => send({ type: "chunk", delta }),
          onReasoning: (count) => {
            // Throttle: only emit every 10 reasoning chunks.
            if (count % 10 === 0) send({ type: "thinking", count });
          },
          // When the client cancels, the fetch aborts and req.signal fires,
          // tearing down the upstream model request too.
          signal: req.signal,
        });
        console.log(
          `[generate] done in ${Date.now() - t0}ms, stop_reason=${result.stopReason}, usage=`,
          result.usage
        );
        send({
          type: "done",
          ...(result.json as object),
          meta: {
            stop_reason: result.stopReason,
            usage: result.usage,
            provider: model.provider,
            elapsed_ms: Date.now() - t0,
          },
        });
      } catch (err) {
        // Client cancelled / disconnected — the stream is already gone, so
        // there's nothing to report and nothing to enqueue.
        if (req.signal.aborted) {
          console.log(`[generate] aborted by client after ${Date.now() - t0}ms`);
        } else {
          console.error(`[generate] error after ${Date.now() - t0}ms`, err);
          const message =
            err instanceof Error ? err.message : String(err);
          const status =
            err instanceof ProviderError ? err.status : 500;
          send({ type: "error", message, status });
        }
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed by the aborted connection.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
