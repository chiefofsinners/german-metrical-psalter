import { task } from "@trigger.dev/sdk/v3";
import { runJob } from "../lib/jobs";
import { OUTPUT_SCHEMA } from "../lib/prompt";
import type { ModelConfig } from "../lib/providers";

export interface GeneratePayload {
  id: string;
  model: ModelConfig;
  systemPrompt: string;
  userPrompt: string;
  createdAt: number;
}

// Runs on Trigger.dev's infrastructure (not Vercel), so it isn't bound by the
// serverless function timeout. It writes all progress/result to Upstash via
// runJob, which the app's /api/job endpoints read. runJob never throws — it
// records errors/cancellation in Redis and returns — so the task always
// completes cleanly and Trigger won't retry (retries are off anyway).
export const generatePsalm = task({
  id: "generate-psalm",
  maxDuration: 3600,
  retry: { maxAttempts: 1 },
  run: async (payload: GeneratePayload) => {
    await runJob(payload.id, {
      model: payload.model,
      systemPrompt: payload.systemPrompt,
      userPrompt: payload.userPrompt,
      schema: OUTPUT_SCHEMA,
      createdAt: payload.createdAt,
    });
    return { id: payload.id };
  },
});
