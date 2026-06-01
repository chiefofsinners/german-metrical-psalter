"use client";

import { useEffect, useRef, useState } from "react";

type Stanza = { lines: string[] };
type Variant = { notes?: string; stanzas: Stanza[] };
type GenerateResponse = {
  variants: Variant[];
  meta?: { stop_reason?: string; usage?: Record<string, number> };
  error?: string;
};

type Provider = "anthropic" | "openai" | "xai" | "deepseek";
type ModelInfo = {
  id: string;
  label: string;
  provider: Provider;
  available: boolean;
};

const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  xai: "xAI",
  deepseek: "DeepSeek",
};
const PROVIDER_ORDER: Provider[] = ["anthropic", "openai", "xai", "deepseek"];

export default function Home() {
  const [psalm, setPsalm] = useState(23);
  const [variantCount, setVariantCount] = useState(3);
  const [model, setModel] = useState<string>("claude-sonnet-4-6");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [hebrew, setHebrew] = useState<string[]>([]);
  const [hebrewLoading, setHebrewLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setElapsed(0);
    const start = Date.now();
    elapsedTimer.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      250
    );
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          psalm,
          variants: variantCount,
          model,
        }),
      });
      const d: GenerateResponse = await r.json();
      if (!r.ok) {
        setError(d.error ?? `HTTP ${r.status}`);
      } else {
        setResult(d);
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
      <header className="border-b border-stone-200 dark:border-stone-800 px-6 py-4">
        <h1 className="text-xl font-serif">German Metrical Psalter</h1>
        <p className="text-sm text-stone-500">
          Renders the Hebrew Psalms into singable modern German Common Metre
          (8.6.8.6, iambic). Translated each time by Claude Sonnet 4.6.
        </p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[1fr_320px_2fr] gap-6 p-6">
        <section className="min-w-0">
          <h2 className="text-sm uppercase tracking-wider text-stone-500 mb-3">
            Hebrew — Psalm {psalm}
          </h2>
          <div
            dir="rtl"
            lang="he"
            className="font-serif text-xl leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap"
            style={{ fontFamily: '"SBL Hebrew", "Ezra SIL", "Times New Roman", serif' }}
          >
            {hebrewLoading ? (
              <span className="text-stone-400 text-base">Laden…</span>
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
              Psalm <span className="text-stone-400">— {psalm}</span>
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
              Variants: {variantCount}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={variantCount}
              onChange={(e) => setVariantCount(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">Model</label>
            <div className="space-y-3">
              {PROVIDER_ORDER.map((p) => {
                const group = models.filter((m) => m.provider === p);
                if (group.length === 0) return null;
                return (
                  <div key={p}>
                    <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">
                      {PROVIDER_LABEL[p]}
                    </div>
                    <div className="flex flex-wrap gap-1">
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
                                ? `Missing API key for ${PROVIDER_LABEL[p]}`
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
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="w-full py-2 rounded bg-black text-stone-50 hover:bg-stone-500 disabled:opacity-50 disabled:hover:bg-black dark:bg-stone-700 dark:text-stone-50 dark:hover:bg-stone-300 dark:hover:text-stone-900 dark:disabled:hover:bg-stone-700 dark:disabled:hover:text-stone-50 transition-colors"
          >
            {generating ? `Generating… ${elapsed}s` : "Generate"}
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
              {result.meta.usage.input_tokens} in /{" "}
              {result.meta.usage.output_tokens} out
              {result.meta.usage.cache_read_input_tokens
                ? ` · ${result.meta.usage.cache_read_input_tokens} cached`
                : ""}
            </p>
          )}
        </aside>

        <section className="min-w-0 space-y-6">
          <h2 className="text-sm uppercase tracking-wider text-stone-500">
            German Common Metre
          </h2>
          {!result && !generating && (
            <p className="text-stone-400 italic">
              Press <em>Generate</em> to render Psalm {psalm} into {variantCount}{" "}
              version{variantCount === 1 ? "" : "s"}.
            </p>
          )}
          {generating && (
            <p className="text-stone-400 italic">
              Claude is composing… {elapsed}s elapsed. Long psalms may take a
              minute or two.
            </p>
          )}
          {result?.variants?.map((variant, vi) => (
            <article
              key={vi}
              className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 bg-white dark:bg-stone-900"
            >
              <header className="flex items-baseline justify-between mb-3">
                <h3 className="font-serif text-lg">Version {vi + 1}</h3>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(stanzasToText(variant.stanzas))
                  }
                  className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  Copy
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
