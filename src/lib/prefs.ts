import type { Lang } from "./i18n";
import { DEFAULT_METER_ID } from "./meters";

// Persisted UI preferences. Stored in a cookie (not just localStorage) so the
// server can read them and render the correct content on the first paint — no
// flash from defaults, and the page is never blank if client JS is slow/fails.
// The system prompt text itself stays in localStorage (too large for a cookie);
// only a `promptCustomized` flag rides in the cookie so the settings dot renders
// correctly server-side.

export const PREFS_COOKIE = "psalter.prefs";
export const PROMPT_STORAGE_KEY = "psalter.systemPrompt";
export const DEFAULT_MODEL = "claude-sonnet-4-6";

export interface Prefs {
  lang: Lang;
  model: string;
  psalm: number;
  variants: number;
  meter: string;
  promptCustomized: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  lang: "en",
  model: DEFAULT_MODEL,
  psalm: 23,
  variants: 3,
  meter: DEFAULT_METER_ID,
  promptCustomized: false,
};

export function parsePrefs(raw: string | undefined): Prefs {
  if (!raw) return DEFAULT_PREFS;
  let o: Partial<Prefs>;
  try {
    o = JSON.parse(raw) as Partial<Prefs>;
  } catch {
    return DEFAULT_PREFS;
  }
  return {
    lang: o.lang === "de" || o.lang === "en" ? o.lang : DEFAULT_PREFS.lang,
    model:
      typeof o.model === "string" && o.model ? o.model : DEFAULT_PREFS.model,
    psalm:
      typeof o.psalm === "number" &&
      Number.isInteger(o.psalm) &&
      o.psalm >= 1 &&
      o.psalm <= 150
        ? o.psalm
        : DEFAULT_PREFS.psalm,
    variants:
      typeof o.variants === "number" &&
      Number.isInteger(o.variants) &&
      o.variants >= 1 &&
      o.variants <= 5
        ? o.variants
        : DEFAULT_PREFS.variants,
    meter:
      typeof o.meter === "string" && o.meter ? o.meter : DEFAULT_PREFS.meter,
    promptCustomized: o.promptCustomized === true,
  };
}

// Serialize prefs to a cookie string. Used on the client to persist changes;
// a one-year max-age, lax same-site, root path.
export function serializePrefsCookie(prefs: Prefs): string {
  const value = encodeURIComponent(JSON.stringify(prefs));
  return `${PREFS_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}
