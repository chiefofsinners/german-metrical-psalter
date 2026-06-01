"use client";

import { useEffect, useRef, useState } from "react";
import { STRINGS, type Lang } from "@/lib/i18n";

type Stanza = { lines: string[] };
type Variant = { notes?: string; stanzas: Stanza[] };
type GenerateResponse = {
  variants: Variant[];
  meta?: { stop_reason?: string; usage?: Record<string, number> };
  error?: string;
};

type Provider =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "deepseek"
  | "openrouter"
  | "lmstudio";
type ModelInfo = {
  id: string;
  label: string;
  provider: Provider;
  available: boolean;
};

const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  xai: "xAI",
  deepseek: "DeepSeek",
  openrouter: "Open Source (via OpenRouter)",
  lmstudio: "Local (LM Studio)",
};
const PROVIDER_ORDER: Provider[] = [
  "anthropic",
  "openai",
  "google",
  "xai",
  "deepseek",
  "openrouter",
  "lmstudio",
];

const LANG_STORAGE_KEY = "psalter.lang";

export default function Home() {
  const [psalm, setPsalm] = useState(23);
  const [variantCount, setVariantCount] = useState(3);
  const [model, setModel] = useState<string>("claude-sonnet-4-6");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [collapsedProviders, setCollapsedProviders] = useState<Set<Provider>>(
    () => new Set(PROVIDER_ORDER.filter((p) => p !== "anthropic"))
  );
  const [hebrew, setHebrew] = useState<string[]>([]);
  const [hebrewLoading, setHebrewLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [streamingText, setStreamingText] = useState("");
  const [reasoningCount, setReasoningCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = STRINGS[lang];

  useEffect(() => {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "en" || saved === "de") setLang(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setHebrewLoading(true);
    fetch(`/api/psalm/${psalm}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setHebrew(d.verses ?? []);
      })
      .finally(() => {
        if (!cancelled) setHebrewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [psalm]);

  async function generate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    setStreamingText("");
    setReasoningCount(0);
    setElapsed(0);
    const start = Date.now();
    elapsedTimer.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      250
    );
    let accumulated = "";
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ psalm, variants: variantCount, model }),
      });
      if (!r.body) {
        setError(`HTTP ${r.status} (no body)`);
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const line = raw.startsWith("data: ") ? raw.slice(6) : raw;
          if (!line.trim()) continue;
          let event: { type: string; [k: string]: unknown };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "chunk" && typeof event.delta === "string") {
            accumulated += event.delta;
            setStreamingText(accumulated);
          } else if (event.type === "thinking" && typeof event.count === "number") {
            setReasoningCount(event.count);
          } else if (event.type === "done") {
            const { type: _t, ...rest } = event;
            void _t;
            setResult(rest as unknown as GenerateResponse);
          } else if (event.type === "error") {
            setError(String(event.message ?? "unknown error"));
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
      if (elapsedTimer.current) {
        clearInterval(elapsedTimer.current);
        elapsedTimer.current = null;
      }
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="border-b border-stone-200 dark:border-stone-800 px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif">{t.appTitle}</h1>
          <p className="text-sm text-stone-500">{t.appSubtitle}</p>
        </div>
        <div className="shrink-0 inline-flex border border-stone-300 dark:border-stone-700 rounded overflow-hidden text-xs tabular-nums">
          {(["en", "de"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-1 transition-colors ${
                lang === l
                  ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                  : "text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
              aria-pressed={lang === l}
              aria-label={l === "en" ? "English" : "Deutsch"}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[1fr_320px_2fr] gap-6 p-6">
        <section className="min-w-0">
          <h2 className="text-sm uppercase tracking-wider text-stone-500 mb-3">
            {t.hebrewHeader(psalm)}
          </h2>
          <div
            dir="rtl"
            lang="he"
            className="font-serif text-4xl leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap"
            style={{ fontFamily: '"SBL Hebrew", "Ezra SIL", "Times New Roman", serif' }}
          >
            {hebrewLoading ? (
              <span className="text-stone-400 text-base">{t.hebrewLoading}</span>
            ) : (
              hebrew.map((v, i) => (
                <p key={i} className="mb-2">
                  <span className="text-xs text-stone-400 align-top mx-1">
                    {i + 1}
                  </span>
                  {v}
                </p>
              ))
            )}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start space-y-4 border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900">
          <div>
            <label className="block text-sm mb-2">
              {t.psalmLabel}{" "}
              <span className="text-stone-400">— {psalm}</span>
            </label>
            <div className="grid grid-cols-10 gap-0.5">
              {Array.from({ length: 150 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPsalm(n)}
                  className={`text-[10px] py-1 rounded tabular-nums transition-colors ${
                    n === psalm
                      ? "bg-stone-800 text-stone-50 dark:bg-stone-200 dark:text-stone-900"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">
              {t.variantsLabel(variantCount)}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={variantCount}
              onChange={(e) => setVariantCount(Number(e.target.value))}
              className="variants-slider w-full"
              style={
                {
                  "--p": `${((variantCount - 1) / 4) * 100}%`,
                } as React.CSSProperties
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-2">{t.modelLabel}</label>
            <div className="space-y-1">
              {PROVIDER_ORDER.map((p) => {
                const group = models.filter((m) => m.provider === p);
                if (group.length === 0) return null;
                const collapsed = collapsedProviders.has(p);
                const containsSelected = group.some((m) => m.id === model);
                return (
                  <div key={p}>
                    <button
                      onClick={() =>
                        setCollapsedProviders((prev) => {
                          const next = new Set(prev);
                          if (next.has(p)) next.delete(p);
                          else next.add(p);
                          return next;
                        })
                      }
                      className="flex w-full items-center gap-1.5 text-[10px] uppercase tracking-wider text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 py-1"
                      aria-expanded={!collapsed}
                    >
                      <span
                        className={`inline-block transition-transform ${
                          collapsed ? "" : "rotate-90"
                        }`}
                      >
                        ▸
                      </span>
                      <span>{PROVIDER_LABEL[p]}</span>
                      <span className="text-stone-300 dark:text-stone-600">
                        ({group.length})
                      </span>
                      {collapsed && containsSelected && (
                        <span className="ml-auto normal-case tracking-normal text-[11px] text-stone-600 dark:text-stone-300">
                          {group.find((m) => m.id === model)?.label}
                        </span>
                      )}
                    </button>
                    {!collapsed && (
                      <div className="flex flex-wrap gap-1 mt-1 mb-2">
                        {group.map((m) => {
                          const selected = m.id === model;
                          const disabled = !m.available;
                          return (
                            <button
                              key={m.id}
                              onClick={() => !disabled && setModel(m.id)}
                              disabled={disabled}
                              title={
                                disabled
                                  ? t.missingKey(PROVIDER_LABEL[p])
                                  : m.id
                              }
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                selected
                                  ? "bg-stone-900 text-stone-50 border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100"
                                  : disabled
                                  ? "border-stone-200 text-stone-300 line-through cursor-not-allowed dark:border-stone-800 dark:text-stone-600"
                                  : "border-stone-300 text-stone-700 hover:border-stone-900 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-100 dark:hover:text-stone-100"
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="w-full py-2 rounded bg-stone-200 text-stone-900 hover:bg-stone-900 hover:text-stone-50 disabled:opacity-50 disabled:hover:bg-stone-200 disabled:hover:text-stone-900 dark:bg-stone-700 dark:text-stone-50 dark:hover:bg-stone-300 dark:hover:text-stone-900 dark:disabled:hover:bg-stone-700 dark:disabled:hover:text-stone-50 transition-colors"
          >
            {generating ? t.generating(elapsed) : t.generate}
          </button>
          {generating && (
            <div className="h-1 w-full overflow-hidden rounded bg-stone-200 dark:bg-stone-800">
              <div className="h-full w-1/3 bg-stone-800 dark:bg-stone-200 animate-indeterminate" />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {result?.meta?.usage && (
            <p className="text-xs text-stone-400">
              {t.usage(
                result.meta.usage.input_tokens,
                result.meta.usage.output_tokens,
                result.meta.usage.cache_read_input_tokens
              )}
            </p>
          )}
        </aside>

        <section className="min-w-0 space-y-6">
          <h2 className="text-sm uppercase tracking-wider text-stone-500">
            {t.outputHeader}
          </h2>
          {!result && !generating && (
            <p className="text-stone-400 italic">
              {t.pressGenerate(psalm, variantCount)}
            </p>
          )}
          {generating && (
            <div className="space-y-2">
              <p className="text-stone-400 italic">
                {streamingText.length > 0
                  ? t.streamingChars(streamingText.length, elapsed)
                  : reasoningCount > 0
                  ? t.streamingThinking(reasoningCount, elapsed)
                  : t.streamingWaiting(elapsed)}
              </p>
              {streamingText.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">
                    {t.showRaw}
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-stone-100 dark:bg-stone-900 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-stone-700 dark:text-stone-300">
                    {streamingText}
                  </pre>
                </details>
              )}
            </div>
          )}
          {result?.variants?.map((variant, vi) => (
            <article
              key={vi}
              className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900"
            >
              <header className="flex items-baseline justify-between mb-3">
                <h3 className="font-serif text-lg">{t.versionHeader(vi + 1)}</h3>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(stanzasToText(variant.stanzas))
                  }
                  className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  {t.copy}
                </button>
              </header>
              {variant.notes && (
                <p className="text-xs text-stone-500 italic mb-3">
                  {variant.notes}
                </p>
              )}
              <div className="font-serif text-base leading-relaxed space-y-3">
                {variant.stanzas.map((s, si) => (
                  <div key={si}>
                    {s.lines.map((line, li) => (
                      <p key={li} className={li % 2 === 1 ? "pl-6" : ""}>
                        {line}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

function stanzasToText(stanzas: Stanza[]): string {
  return stanzas
    .map((s) => s.lines.join("\n"))
    .join("\n\n");
}
