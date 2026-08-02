"use client";

import { useEffect } from "react";

/**
 * The last boundary: this fires when the ROOT layout itself throws, which means
 * it renders instead of `<html>`/`<body>` — no LanguageProvider, no
 * ThemeProvider, no font variables, and no guarantee that the stylesheet
 * carrying our tokens has loaded.
 *
 * So it is styled inline against literal hex values rather than CSS variables,
 * and worded in English only. Everything that would let it do better is exactly
 * what has just failed. Reaching for `t()` or `var(--brass)` here would produce
 * a boundary that breaks in the one situation it exists for.
 *
 * Dark ground unconditionally: a light-theme reader gets an unexpected dark
 * page, which is a far smaller failure than white-on-white if the token sheet
 * is missing.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07090f",
          color: "#eef2f7",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#c9a227",
              margin: 0,
            }}
          >
            MindKshetra
          </p>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 600,
              margin: "0.75rem 0 0",
              lineHeight: 1.3,
            }}
          >
            Something went wrong on our side
          </h1>
          <p
            style={{
              margin: "0.75rem 0 0",
              lineHeight: 1.7,
              color: "#c3ccd9",
              fontSize: "0.95rem",
            }}
          >
            The app failed to start on this page. Nothing you have saved is
            affected — trying again is usually enough.
          </p>
          <div
            style={{
              marginTop: "1.75rem",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 44,
                padding: "0.65rem 1.25rem",
                background: "#c9a227",
                color: "#07090f",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
                padding: "0.65rem 1.25rem",
                border: "1px solid rgba(201,162,39,0.22)",
                color: "#9aa8bc",
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              Back to MindKshetra
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
