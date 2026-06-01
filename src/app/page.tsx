import { cookies } from "next/headers";
import { PREFS_COOKIE, parsePrefs } from "@/lib/prefs";
import { Psalter } from "./Psalter";

// Read persisted prefs from the cookie and render the correct content
// server-side — no flicker, and real content in the SSR HTML (the page is never
// a blank/spinner if client JS is slow or fails). Reading cookies opts this
// route into dynamic rendering, which is what we want here.
export default async function Page() {
  const store = await cookies();
  const prefs = parsePrefs(store.get(PREFS_COOKIE)?.value);
  return <Psalter initial={prefs} />;
}
