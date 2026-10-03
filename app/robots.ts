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
 * `/madhav?prompt=…` is linked from every verse and mood page — one URL per
 * verse, each rendering the same chat shell — so prompted variants are kept
 * out of the crawl. `/madhav` itself stays crawlable and canonical.
 *
 * AI search and answer crawlers are named explicitly so the policy is a
 * decision on record rather than a wildcard default. Training crawlers are
 * currently allowed by `*`; that is an owner's call, not an SEO one.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/auth/", "/admin/", "/*?prompt="];
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
