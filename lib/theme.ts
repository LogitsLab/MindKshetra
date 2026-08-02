/**
 * The theme storage key, in a module with no "use client" directive.
 *
 * That is the whole point of this file. The constant used to live in
 * ThemeProvider, and importing it into the server-rendered root layout looked
 * fine and typechecked cleanly — but a value imported from a "use client"
 * module into a server component arrives as a client-reference PROXY, not the
 * value. `JSON.stringify(THEME_STORAGE_KEY)` produced `{}`, so the anti-flash
 * script shipped as `localStorage.getItem({})` and silently did nothing.
 *
 * A plain module is readable from both sides, so the script that reads the key
 * and the provider that writes it stay provably in step.
 */
export const THEME_STORAGE_KEY = "mindkshetra-theme";

export type Theme = "dark" | "light";

/**
 * The blocking script the root layout inlines, so `data-theme` is correct
 * before first paint rather than after hydration.
 *
 * Built here rather than in layout.tsx so it can be asserted in a test — the
 * failure mode is a script that parses, runs, throws nothing, and quietly does
 * the wrong thing, which no typecheck or lint will ever catch.
 */
export function themeInitScript(): string {
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY
  )});document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){}})()`;
}
