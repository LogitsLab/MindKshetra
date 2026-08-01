"use client";

import { useLanguage } from "@/components/LanguageProvider";

/**
 * Must be the first focusable element in the document, which is why it is
 * rendered as the first child inside LanguageProvider rather than anywhere
 * more natural-looking. Styling lives in globals.css (`.skip-link`): the
 * hidden-until-focused pattern needs a transform pair, not utilities.
 *
 * Target is `#main-content` on MainShell, which carries tabIndex={-1} so the
 * jump actually moves focus and not just the scroll position.
 */
export default function SkipLink() {
  const { t } = useLanguage();
  return (
    <a href="#main-content" className="skip-link">
      {t("skipToContent")}
    </a>
  );
}
