import { Psalter } from "./Psalter";

// Settings are session-scoped (sessionStorage) and not readable on the server,
// so the page renders from defaults and the client re-applies any stored
// settings after mount. See src/lib/prefs.ts.
export default function Page() {
  return <Psalter />;
}
