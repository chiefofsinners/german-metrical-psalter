import { NextResponse } from "next/server";
import { MODELS, discoverLMStudioModels } from "@/lib/providers";

export const runtime = "nodejs";

const ENV_KEYS = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  xai: "XAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
} as const;

export async function GET() {
  const cloudModels = MODELS.map((m) => ({
    ...m,
    available:
      m.provider === "lmstudio"
        ? true
        : Boolean(process.env[ENV_KEYS[m.provider as keyof typeof ENV_KEYS]]),
  }));

  const localModels = (await discoverLMStudioModels()).map((m) => ({
    ...m,
    available: true,
  }));

  return NextResponse.json({ models: [...cloudModels, ...localModels] });
}
