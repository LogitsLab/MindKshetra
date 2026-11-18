import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Crawl policy. API routes, auth handoffs and admin carry no public content;
 * `/api/og/` stays open because verse share cards are what link previews and
 * image search fetch. Per-user pages (account, journal, favorites…) are kept
 * out with a `noindex` robots meta instead of a Disallow here — a disallowed
 * URL can still be indexed from links, because the crawler never sees the
 * noindex.
 *
 * `/madhav?prompt=…` is linked from verse and mood pages. Those variants are
 * not Disallow'd: blocking them in robots.txt left ~60 "Blocked by robots.txt"
 * Coverage rows and stopped Google from reading the self-canonical on
 * `/madhav`. The page already canonicalises every prompted URL to `/madhav`.
 *
 * AI search and answer crawlers are named explicitly so the policy is a
 * decision on record rather than a wildcard default. Training crawlers are
 * currently allowed by `*`; that is an owner's call, not an SEO one.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/auth/", "/admin/"];
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/api/og/"], disallow },
      {
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Perplexity-User",
        ],
        allow: ["/", "/api/og/"],
        disallow,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
