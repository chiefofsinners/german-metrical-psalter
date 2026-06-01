import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type Provider = "anthropic" | "openai" | "xai" | "deepseek";

export interface ModelConfig {
  id: string;
  label: string;
  provider: Provider;
}

export const MODELS: ModelConfig[] = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", provider: "anthropic" },
  { id: "claude-opus-4-7", label: "Opus 4.7", provider: "anthropic" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", provider: "anthropic" },
  { id: "gpt-5.5", label: "GPT-5.5", provider: "openai" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini", provider: "openai" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 nano", provider: "openai" },
  { id: "grok-4.3", label: "Grok 4.3", provider: "xai" },
  { id: "deepseek-v4-pro", label: "V4 Pro", provider: "deepseek" },
  { id: "deepseek-v4-flash", label: "V4 Flash", provider: "deepseek" },
];

export function findModel(id: string): ModelConfig | undefined {
  return MODELS.find((m) => m.id === id);
}

interface ProviderEndpoint {
  envKey: string;
  baseURL?: string;
}

const ENDPOINTS: Record<Exclude<Provider, "anthropic">, ProviderEndpoint> = {
  openai: { envKey: "OPENAI_API_KEY" },
  xai: { envKey: "XAI_API_KEY", baseURL: "https://api.x.ai/v1" },
  deepseek: { envKey: "DEEPSEEK_API_KEY", baseURL: "https://api.deepseek.com/v1" },
};

export interface GenerateInput {
  model: ModelConfig;
  systemPrompt: string;
  userPrompt: string;
  schema: object;
}

export interface GenerateOutput {
  json: unknown;
  stopReason: string;
  usage: Record<string, number>;
}

export class ProviderError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function generateVariants(input: GenerateInput): Promise<GenerateOutput> {
  switch (input.model.provider) {
    case "anthropic":
      return generateAnthropic(input);
    case "openai":
    case "xai":
      return generateOpenAICompat(input, input.model.provider, /* schemaSupport */ true);
    case "deepseek":
      return generateOpenAICompat(input, "deepseek", /* schemaSupport */ false);
  }
}

async function generateAnthropic(input: GenerateInput): Promise<GenerateOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ProviderError("ANTHROPIC_API_KEY is not set", 401);

  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: input.model.id,
    max_tokens: 16000,
    thinking: { type: "disabled" },
    system: [
      {
        type: "text",
        text: input.systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: input.userPrompt }],
    output_config: {
      format: { type: "json_schema", schema: input.schema as { [k: string]: unknown } },
    },
  });

  const final = await stream.finalMessage();
  const text = final.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  )?.text;
  if (!text) {
    throw new ProviderError(
      `Anthropic returned no text content (stop_reason=${final.stop_reason})`,
      502
    );
  }

  return {
    json: safeParse(text),
    stopReason: final.stop_reason ?? "unknown",
    usage: {
      input_tokens: final.usage.input_tokens,
      output_tokens: final.usage.output_tokens,
      cache_read_input_tokens: final.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: final.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

async function generateOpenAICompat(
  input: GenerateInput,
  provider: "openai" | "xai" | "deepseek",
  schemaSupport: boolean
): Promise<GenerateOutput> {
  const endpoint = ENDPOINTS[provider];
  const apiKey = process.env[endpoint.envKey];
  if (!apiKey) throw new ProviderError(`${endpoint.envKey} is not set`, 401);

  const client = new OpenAI({ apiKey, baseURL: endpoint.baseURL });

  const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: input.model.id,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userPrompt },
    ],
    response_format: schemaSupport
      ? {
          type: "json_schema",
          json_schema: {
            name: "psalter_variants",
            schema: input.schema as Record<string, unknown>,
            strict: true,
          },
        }
      : { type: "json_object" },
  };

  const completion = await client.chat.completions.create(params);
  const choice = completion.choices[0];
  const text = choice?.message?.content;
  if (!text) {
    throw new ProviderError(
      `${provider} returned no message content (finish_reason=${choice?.finish_reason})`,
      502
    );
  }

  return {
    json: safeParse(text),
    stopReason: choice.finish_reason ?? "unknown",
    usage: {
      input_tokens: completion.usage?.prompt_tokens ?? 0,
      output_tokens: completion.usage?.completion_tokens ?? 0,
    },
  };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError(`Model returned non-JSON output: ${text.slice(0, 200)}`, 502);
  }
}
