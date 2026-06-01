export type Lang = "en" | "de";

export const STRINGS = {
  en: {
    appTitle: "German Metrical Psalter",
    appSubtitle:
      "Renders the Hebrew Psalms into singable modern German Common Metre (8.6.8.6, iambic).",
    hebrewHeader: (n: number) => `Hebrew — Psalm ${n}`,
    hebrewLoading: "Loading…",
    psalmLabel: "Psalm",
    variantsLabel: (n: number) => `Variants: ${n}`,
    modelLabel: "Model",
    missingKey: (provider: string) => `Missing API key for ${provider}`,
    generate: "Generate",
    generating: (s: number) => `Generating… ${s}s`,
    outputHeader: "German Common Metre",
    pressGenerate: (psalm: number, n: number) =>
      `Press Generate to render Psalm ${psalm} into ${n} version${n === 1 ? "" : "s"}.`,
    composing: (s: number) =>
      `Composing… ${s}s elapsed. Long psalms may take a minute or two.`,
    versionHeader: (n: number) => `Version ${n}`,
    copy: "Copy",
    usage: (input: number, output: number, cached?: number) =>
      `${input} in / ${output} out${cached ? ` · ${cached} cached` : ""}`,
  },
  de: {
    appTitle: "Deutscher metrischer Psalter",
    appSubtitle:
      "Vertont die hebräischen Psalmen als singbares modernes Deutsch im Common Metre (8.6.8.6, jambisch).",
    hebrewHeader: (n: number) => `Hebräisch — Psalm ${n}`,
    hebrewLoading: "Laden…",
    psalmLabel: "Psalm",
    variantsLabel: (n: number) => `Fassungen: ${n}`,
    modelLabel: "Modell",
    missingKey: (provider: string) => `Kein API-Schlüssel für ${provider}`,
    generate: "Erzeugen",
    generating: (s: number) => `Erzeuge… ${s}s`,
    outputHeader: "Deutsch im Common Metre",
    pressGenerate: (psalm: number, n: number) =>
      `Drücke „Erzeugen", um Psalm ${psalm} in ${n} Fassung${n === 1 ? "" : "en"} zu setzen.`,
    composing: (s: number) =>
      `Komponiere… ${s}s vergangen. Lange Psalmen brauchen ein paar Minuten.`,
    versionHeader: (n: number) => `Fassung ${n}`,
    copy: "Kopieren",
    usage: (input: number, output: number, cached?: number) =>
      `${input} ein / ${output} aus${cached ? ` · ${cached} aus Cache` : ""}`,
  },
} as const satisfies Record<Lang, unknown>;
