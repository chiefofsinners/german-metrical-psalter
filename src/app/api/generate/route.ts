import { NextRequest, NextResponse } from "next/server";
import { getPsalm } from "@/lib/psalms";
import { SYSTEM_PROMPT, buildUserPrompt, OUTPUT_SCHEMA } from "@/lib/prompt";
import {
  findModel,
  generateVariants,
  ProviderError,
  MODELS,
} from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: {
    psalm?: number;
    variants?: number;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const psalm = Number(body.psalm);
  const variants = Number(body.variants ?? 3);
  const modelId = body.model ?? "claude-sonnet-4-6";

  if (!Number.isInteger(psalm) || psalm < 1 || psalm > 150) {
    return NextResponse.json(
      { error: "psalm must be an integer between 1 and 150" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(variants) || variants < 1 || variants > 5) {
    return NextResponse.json(
      { error: "variants must be an integer between 1 and 5" },
      { status: 400 }
    );
  }
  const model = findModel(modelId);
  if (!model) {
    return NextResponse.json(
      {
        error: `unknown model "${modelId}". Known: ${MODELS.map((m) => m.id).join(", ")}`,
      },
      { status: 400 }
    );
  }

  const hebrew = getPsalm(psalm);
  if (!hebrew) {
    return NextResponse.json({ error: `Psalm ${psalm} not found` }, { status: 404 });
  }

  console.log(
    `[generate] psalm=${psalm} variants=${variants} verses=${hebrew.length} model=${model.id}`
  );
  const t0 = Date.now();

  try {
    const result = await generateVariants({
      model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(psalm, hebrew, variants),
      schema: OUTPUT_SCHEMA,
    });
    console.log(
      `[generate] done in ${Date.now() - t0}ms, stop_reason=${result.stopReason}, usage=`,
      result.usage
    );
    return NextResponse.json({
      ...(result.json as object),
      meta: {
        stop_reason: result.stopReason,
        usage: result.usage,
        provider: model.provider,
      },
    });
  } catch (err) {
    console.error(`[generate] error after ${Date.now() - t0}ms`, err);
    if (err instanceof ProviderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
