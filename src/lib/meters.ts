// Hymn metres the user can render into. Each carries its per-line syllable
// pattern, the dominant foot (so German word-stress aligns with the beat), and a
// conventional rhyme scheme. The pattern length is the number of lines per
// stanza. Buttons in the UI are ordered as listed here.

export interface Meter {
  id: string;
  // Button label, e.g. "CM" or "8.7.8.7".
  short: string;
  // Full descriptive label used in prompts, e.g. "Common Metre (8.6.8.6)".
  label: string;
  pattern: number[];
  foot: string;
  rhyme: string;
}

export const METERS: Meter[] = [
  {
    id: "CM",
    short: "CM",
    label: "Common Metre (8.6.8.6)",
    pattern: [8, 6, 8, 6],
    foot: "iambic (unstressed–stressed; each line builds from iambs)",
    rhyme:
      "ABAB or ABCB — lines 2 and 4 always rhyme; lines 1 and 3 may rhyme or not",
  },
  {
    id: "LM",
    short: "LM",
    label: "Long Metre (8.8.8.8)",
    pattern: [8, 8, 8, 8],
    foot: "iambic (four iambs per line)",
    rhyme: "ABAB or AABB",
  },
  {
    id: "SM",
    short: "SM",
    label: "Short Metre (6.6.8.6)",
    pattern: [6, 6, 8, 6],
    foot: "iambic",
    rhyme: "ABAB or ABCB — lines 2 and 4 always rhyme",
  },
  {
    id: "7.6.7.6",
    short: "7.6.7.6",
    label: "7.6.7.6",
    pattern: [7, 6, 7, 6],
    foot: "iambic; the 7-syllable lines take a feminine (unstressed) ending",
    rhyme: "ABAB or ABCB — lines 2 and 4 rhyme",
  },
  {
    id: "7.7.7.7",
    short: "7.7.7.7",
    label: "7.7.7.7",
    pattern: [7, 7, 7, 7],
    foot: "trochaic (stressed–unstressed; each line starts on a stress, catalectic ending)",
    rhyme: "AABB or ABAB",
  },
  {
    id: "8.7.8.7",
    short: "8.7.8.7",
    label: "8.7.8.7",
    pattern: [8, 7, 8, 7],
    foot: "trochaic; 8-syllable lines end feminine (unstressed), 7-syllable lines end masculine (stressed)",
    rhyme: "ABAB — alternating feminine/masculine line-endings",
  },
  {
    id: "9.8.9.8",
    short: "9.8.9.8",
    label: "9.8.9.8",
    pattern: [9, 8, 9, 8],
    foot: "iambic; 9-syllable lines end feminine, 8-syllable lines end masculine",
    rhyme: "ABAB",
  },
  {
    id: "9.9.9.9",
    short: "9.9.9.9",
    label: "9.9.9.9",
    pattern: [9, 9, 9, 9],
    foot: "iambic with a feminine ending (four iambs plus an unstressed syllable)",
    rhyme: "AABB or ABAB",
  },
  {
    id: "10.10.10.10",
    short: "10.10.10.10",
    label: "10.10.10.10",
    pattern: [10, 10, 10, 10],
    foot: "iambic (five iambs per line — iambic pentameter)",
    rhyme: "AABB or ABAB",
  },
  {
    id: "11.10.11.10",
    short: "11.10.11.10",
    label: "11.10.11.10",
    pattern: [11, 10, 11, 10],
    foot: "triple/dactylic feel; 11-syllable lines end feminine, 10-syllable lines end masculine",
    rhyme: "ABAB",
  },
  {
    id: "11.11.11.11",
    short: "11.11.11.11",
    label: "11.11.11.11",
    pattern: [11, 11, 11, 11],
    foot: "anapestic/dactylic (triple metre — a lilting da-da-DUM movement)",
    rhyme: "AABB",
  },
  {
    id: "8.7.8.7.7.7",
    short: "8.7.8.7.7.7",
    label: "8.7.8.7.7.7 (six-line chorale strophe)",
    pattern: [8, 7, 8, 7, 7, 7],
    foot: "trochaic; alternating feminine (8) and masculine (7) endings",
    rhyme: "ABABCC",
  },
];

export const DEFAULT_METER_ID = "CM";

export function findMeter(id: string | undefined): Meter {
  return METERS.find((m) => m.id === id) ?? METERS[0];
}
