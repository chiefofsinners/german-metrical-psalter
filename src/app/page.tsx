"use client";

import { useEffect, useState } from "react";

type Stanza = { lines: string[] };
type Variant = { notes?: string; stanzas: Stanza[] };
type GenerateResponse = {
  variants: Variant[];
  meta?: { stop_reason?: string; usage?: Record<string, number> };
  error?: string;
};

export default function Home() {
  const [psalm, setPsalm] = useState(23);
  const [variantCount, setVariantCount] = useState(3);
  const [hebrew, setHebrew] = useState<string[]>([]);
  const [hebrewLoading, setHebrewLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ psalm, variants: variantCount }),
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
            <label className="block text-sm mb-1">Psalm</label>
            <input
              type="number"
              min={1}
              max={150}
              value={psalm}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isInteger(v) && v >= 1 && v <= 150) setPsalm(v);
              }}
              className="w-full border border-stone-300 dark:border-stone-700 rounded px-2 py-1 bg-transparent"
            />
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
          <button
            onClick={generate}
            disabled={generating}
            className="w-full py-2 rounded bg-stone-800 text-stone-50 hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-200 dark:text-stone-900"
          >
            {generating ? "Generating…" : "Generate"}
          </button>
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
              Claude is composing… long psalms may take a minute.
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
