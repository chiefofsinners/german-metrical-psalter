import { NextResponse } from "next/server";
import { MODELS } from "@/lib/providers";

export const runtime = "nodejs";

const ENV_KEYS = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  xai: "XAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
} as const;

export async function GET() {
  return NextResponse.json({
    models: MODELS.map((m) => ({
      ...m,
      available: Boolean(process.env[ENV_KEYS[m.provider]]),
    })),
  });
}
