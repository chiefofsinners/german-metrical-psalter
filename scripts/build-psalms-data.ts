import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT_PATH = join(process.cwd(), "data", "psalms-he.json");
const VERSION = "Miqra according to the Masorah";
const TOTAL_PSALMS = 150;
const DELAY_MS = 150;

type SefariaV3Response = {
  versions: Array<{
    versionTitle: string;
    text: string[] | string[][];
  }>;
};

function stripMarkup(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&thinsp;/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\{[פס]\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPsalm(n: number): Promise<string[]> {
  const url = `https://www.sefaria.org/api/v3/texts/Psalms.${n}?version=hebrew|${encodeURIComponent(VERSION)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Psalm ${n}: HTTP ${res.status}`);
  const data = (await res.json()) as SefariaV3Response;
  const v = data.versions.find((x) => x.versionTitle === VERSION) ?? data.versions[0];
  if (!v) throw new Error(`Psalm ${n}: no version returned`);
  const raw = v.text;
  const flat: string[] = Array.isArray(raw[0]) ? (raw as string[][]).flat() : (raw as string[]);
  return flat.map(stripMarkup).filter((s) => s.length > 0);
}

async function main() {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  const out: Record<string, string[]> = {};
  for (let n = 1; n <= TOTAL_PSALMS; n++) {
    process.stdout.write(`Psalm ${n}… `);
    const verses = await fetchPsalm(n);
    out[String(n)] = verses;
    process.stdout.write(`${verses.length} verses\n`);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
