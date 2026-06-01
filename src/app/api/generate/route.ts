import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getPsalm } from "@/lib/psalms";
import { SYSTEM_PROMPT, buildUserPrompt, OUTPUT_SCHEMA } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const client = new Anthropic();

export async function POST(req: NextRequest) {
  let body: { psalm?: number; variants?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const psalm = Number(body.psalm);
  const variants = Number(body.variants ?? 3);

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

  const hebrew = getPsalm(psalm);
  if (!hebrew) {
    return NextResponse.json({ error: `Psalm ${psalm} not found` }, { status: 404 });
  }

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildUserPrompt(psalm, hebrew, variants) }],
      output_config: {
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
    });

    const final = await stream.finalMessage();

    const textBlock = final.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    if (!textBlock) {
      return NextResponse.json(
        { error: "Model returned no text content", stop_reason: final.stop_reason },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json(
        { error: "Model returned non-JSON output", raw: textBlock.text },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...(parsed as object),
      meta: {
        stop_reason: final.stop_reason,
        usage: final.usage,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: err.message, type: err.type },
        { status: err.status ?? 500 }
      );
    }
    throw err;
  }
}
