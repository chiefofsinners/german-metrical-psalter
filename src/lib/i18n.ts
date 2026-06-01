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
    streamingWaiting: (s: number) =>
      `Waiting for first token… ${s}s (reasoning models often pause 30–120s before writing).`,
    streamingThinking: (count: number, s: number) =>
      `Thinking… ${count.toLocaleString()} reasoning chunks in ${s}s`,
    streamingChars: (chars: number, s: number) =>
      `Receiving… ${chars.toLocaleString()} chars in ${s}s`,
    showRaw: "Show raw stream",
    versionHeader: (n: number) => `Version ${n}`,
    copy: "Copy",
    usage: (input: number, output: number, cached?: number) =>
      `${input} in / ${output} out${cached ? ` · ${cached} cached` : ""}`,
    promptHeader: "System prompt",
    promptCustomized: "customized",
    promptEdit: "Edit",
    promptSave: "Save",
    promptCancel: "Cancel",
    promptReset: "Reset to default",
    promptHint:
      "Sent to the model on every generation. Saved in your browser.",
    settings: "Settings",
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
    streamingWaiting: (s: number) =>
      `Warte auf erstes Token… ${s}s (Reasoning-Modelle denken oft 30–120s, bevor sie schreiben).`,
    streamingThinking: (count: number, s: number) =>
      `Denke nach… ${count.toLocaleString()} Reasoning-Chunks in ${s}s`,
    streamingChars: (chars: number, s: number) =>
      `Empfange… ${chars.toLocaleString()} Zeichen in ${s}s`,
    showRaw: "Rohdaten anzeigen",
    versionHeader: (n: number) => `Fassung ${n}`,
    copy: "Kopieren",
    usage: (input: number, output: number, cached?: number) =>
      `${input} ein / ${output} aus${cached ? ` · ${cached} aus Cache` : ""}`,
    promptHeader: "System-Prompt",
    promptCustomized: "angepasst",
    promptEdit: "Bearbeiten",
    promptSave: "Speichern",
    promptCancel: "Abbrechen",
    promptReset: "Auf Standard zurücksetzen",
    promptHint:
      "Wird bei jeder Erzeugung an das Modell gesendet. Im Browser gespeichert.",
    settings: "Einstellungen",
  },
} as const satisfies Record<Lang, unknown>;
