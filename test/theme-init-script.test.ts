import { describe, it, expect } from "vitest";
import { THEME_STORAGE_KEY, themeInitScript } from "@/lib/theme";

/**
 * This exists because the first version of the anti-flash script shipped
 * broken and nothing noticed: the key was imported out of ThemeProvider, which
 * is a "use client" module, so the server-rendered layout received a
 * client-reference proxy instead of the string and emitted
 * `localStorage.getItem({})`. It parsed, it ran, it threw nothing, and it did
 * the wrong thing on every page load.
 *
 * Typecheck and lint both passed. Only reading the rendered HTML caught it —
 * so the assertion lives here now.
 */
describe("themeInitScript", () => {
  const script = themeInitScript();

  it("embeds the literal storage key, not a stringified object", () => {
    expect(script).toContain(`localStorage.getItem("${THEME_STORAGE_KEY}")`);
    // The original bug rendered exactly this. `catch(e){}` also contains "{}",
    // so assert on the call site, not the whole string.
    expect(script).not.toContain("getItem({})");
  });

  it("reads the same key ThemeProvider writes", () => {
    expect(THEME_STORAGE_KEY).toBe("mindkshetra-theme");
  });

  it("sets data-theme and treats anything but 'light' as dark", () => {
    expect(script).toContain('setAttribute("data-theme"');
    expect(script).toContain('"light":"dark"');
  });

  it("is a self-contained IIFE that cannot break the page", () => {
    expect(script.startsWith("(function(){")).toBe(true);
    expect(script).toContain("try{");
    expect(script).toContain("catch(e){}");
    // Inlined into <script>: an unescaped "</script>" would close the tag.
    expect(script).not.toContain("</");
  });

  it("actually applies the stored theme when run", () => {
    const store: Record<string, string> = { [THEME_STORAGE_KEY]: "light" };
    const attrs: Record<string, string> = {};
    const localStorage = { getItem: (k: string) => store[k] ?? null };
    const document = {
      documentElement: {
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
      },
    };
    new Function("localStorage", "document", script)(localStorage, document);
    expect(attrs["data-theme"]).toBe("light");
  });

  it("falls back to dark when nothing is stored", () => {
    const attrs: Record<string, string> = {};
    const localStorage = { getItem: () => null };
    const document = {
      documentElement: {
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
      },
    };
    new Function("localStorage", "document", script)(localStorage, document);
    expect(attrs["data-theme"]).toBe("dark");
  });
});
