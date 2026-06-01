import psalmsData from "../../data/psalms-he.json";

const PSALMS = psalmsData as Record<string, string[]>;

export const TOTAL_PSALMS = 150;

export function getPsalm(n: number): string[] | null {
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_PSALMS) return null;
  return PSALMS[String(n)] ?? null;
}
