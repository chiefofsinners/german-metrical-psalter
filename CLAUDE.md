@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app does

Generates singable German Common Metre (8.6.8.6, iambic) renderings of the Hebrew Psalms by routing the same prompt to a user-chosen LLM. The Hebrew source is bundled; the rendering is generated fresh on every request.

## Commands

- `npm run dev` — dev server (Turbopack on port 3000)
- `npm run build` — production build
- `npm start` — serve production build
- `npm run lint` — ESLint
- `npm run build:psalms` — one-off script to refetch Hebrew Psalms from Sefaria and rewrite `data/psalms-he.json`. **The committed JSON is the authoritative source — do not re-run unless deliberately refreshing.** Strips HTML markup and Masoretic paragraph markers (`{פ}`/`{ס}`) but preserves full niqqud and ta'amim.

There is no test runner.

## Deployment constraint (Vercel)

`src/app/api/generate/route.ts` declares `maxDuration = 800`. This requires **Fluid Compute** enabled on the Vercel project — otherwise deploy fails. Classic serverless on Pro caps at 300s; Fluid Compute extends to 800s. The site lives at `https://german-metrical-psalter.vercel.app`. `metadataBase` in `src/app/layout.tsx` defaults there; override via `NEXT_PUBLIC_SITE_URL`.

## Architecture

**Single-page UI + three API routes.** `src/app/page.tsx` is a client component handling all interaction. The three routes are independent and stateless.

```
src/app/page.tsx          (UI: psalm grid, variants slider, provider chips, EN/DE toggle, SSE reader)
src/app/api/psalm/[n]     (GET: bundled Hebrew lookup)
src/app/api/models        (GET: registry + per-model availability + LM Studio discovery)
src/app/api/generate      (POST: SSE stream of generation events)
```

### Provider abstraction (`src/lib/providers.ts`)

The core. Seven providers behind two implementations:

| Provider | Path | Notes |
|---|---|---|
| `anthropic` | `generateAnthropic` | Anthropic SDK, prompt caching on system, json_schema strict, thinking **disabled** |
| `openai` / `google` / `xai` | `generateOpenAICompat` | OpenAI SDK with per-provider `baseURL`, json_schema strict |
| `deepseek` / `openrouter` / `lmstudio` | `generateOpenAICompat` | Same SDK, **json_object** mode (no schema enforcement) |

Per-provider quirks already baked in — don't undo without good reason:

- **Anthropic adaptive thinking is disabled** (`thinking: { type: "disabled" }`). Earlier testing showed it hung the route. The user explicitly asked for the toggle to be removed; do not re-add it without asking.
- **`stream_options.include_usage` is skipped for DeepSeek and LM Studio.** Their compat layers silently break streaming when they don't recognise it.
- **DeepSeek emits `delta.reasoning_content` during the thinking phase**, then switches to `delta.content`. The streaming loop counts both and emits `thinking` events to the client during reasoning so the UI doesn't look frozen.
- **LM Studio uses a dummy `apiKey: "lm-studio"`** (the SDK requires non-empty) and discovers loaded models at runtime via `GET /v1/models`, filtering out embedding/whisper/TTS models that can't do chat completions.
- **Provider availability** is determined by env-key presence (see `ENV_KEYS` in `/api/models/route.ts`). LM Studio is "available" iff the local server responds.

### Models registry

Static cloud models live in the `MODELS` array. LM Studio models are discovered dynamically by `discoverLMStudioModels()` and merged in by `/api/models`. The generate route falls back to LM Studio discovery if `findModel(id)` misses, so any loaded local model is callable without registry edits.

### SSE protocol (`/api/generate`)

The route returns `text/event-stream`. Each event is `data: <json>\n\n`. Event types:

- `start` — `{ model, provider }`
- `chunk` — `{ delta: string }` — content tokens as they arrive
- `thinking` — `{ count }` — reasoning chunk count (throttled every 10), only for models that emit `reasoning_content`
- `heartbeat` — every 10s, keeps the connection alive while a reasoning model is silent
- `done` — final payload: `{ variants, meta: { stop_reason, usage, provider, elapsed_ms } }`
- `error` — `{ message, status? }`

The client reader in `page.tsx` accumulates `chunk.delta` into `streamingText` (shown in a "raw stream" disclosure while generating), tracks `thinking.count` for the live "Thinking… N reasoning chunks" message, and renders structured variants on `done`.

### Prompt (`src/lib/prompt.ts`)

The system prompt is the heart of output quality. It encodes:
- CM rules (8/6/8/6 iambic, ABAB/ABCB rhyme)
- A **fidelity rule** that ranks above rhyme — explicitly forbids inventing content for rhyme convenience (the historical failure mode flagged by user feedback). Includes a `✗ AVOID` / `✓ BETTER` worked example with bad-vs-good Psalm 23 quatrains.
- A modern-German-over-archaisms rule with concrete word-pair examples (`Wiese > Aue`, `geht > wandelt`).
- A per-line self-check the model is told to run before returning.

If output quality regresses, the prompt is the lever — schema and provider plumbing are stable.

### i18n (`src/lib/i18n.ts`)

EN/DE strings as a `STRINGS` object. Function-valued entries take parameters (verse counts, elapsed seconds). Choice persists in `localStorage` under `psalter.lang`. Hebrew block is always Hebrew; model labels and provider names are always English (proper nouns).

### Icon and OG image

Both are rendered via `next/og` `ImageResponse` at request time:
- `src/app/icon.tsx` — 64×64 PNG, served at `/icon`, used as favicon
- `src/app/opengraph-image.tsx` — 1200×630 PNG, served at `/opengraph-image`

Both fetch `Noto Serif Hebrew` from `cdn.jsdelivr.net/fontsource/fonts/noto-serif-hebrew@latest/hebrew-500-normal.ttf` at render time. The font is a **static** TTF — Satori cannot consume variable fonts, so do not switch the URL to the Google Fonts variable file.

## Environment variables

```
ANTHROPIC_API_KEY     # Anthropic
OPENAI_API_KEY        # OpenAI
GOOGLE_API_KEY        # Gemini (AI Studio key)
XAI_API_KEY           # Grok
DEEPSEEK_API_KEY      # DeepSeek
OPENROUTER_API_KEY    # open-source models via OpenRouter
LMSTUDIO_BASE_URL     # optional, defaults to http://localhost:1234/v1
NEXT_PUBLIC_SITE_URL  # optional, defaults to https://german-metrical-psalter.vercel.app
```

Missing keys are not an error — corresponding chips are marked `available: false` and rendered greyed-out with a tooltip explaining the missing key.

## When adding a provider or model

- **New provider:** add to `Provider` union, add `ENDPOINTS` entry, add to the `generateVariants` switch, add to `ENV_KEYS` in `/api/models`, add to `PROVIDER_LABEL` and `PROVIDER_ORDER` in `page.tsx`, add to `.env.local.example`.
- **New model on an existing provider:** add a `MODELS` entry. Sort within provider rows small-to-large — this is a deliberate convention.
- **Verify new model IDs against the provider's live `/v1/models` endpoint** before relying on vendor-doc IDs — they frequently disagree with what's actually served (e.g. Google's `gemini-3.1-pro` doesn't exist as a plain ID; only `gemini-3.1-pro-preview` does).
