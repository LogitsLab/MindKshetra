import type { Metadata } from "next";
import { Fraunces, Noto_Serif_Devanagari, Sora } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ProgressProvider } from "@/components/ProgressProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import Nav from "@/components/Nav";
import MainShell from "@/components/MainShell";
import SkipLink from "@/components/SkipLink";
import SiteFooter from "@/components/SiteFooter";
import NavigationProgress from "@/components/NavigationProgress";
import WelcomeGate from "@/components/WelcomeGate";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";
import { configuredSiteOrigin } from "@/lib/site";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

/**
 * The third face, and the only one that is not a style choice.
 *
 * Fraunces ships no Devanagari subset, so every श्लोक — the app's core content
 * — was silently substituted by whatever serif the OS happened to have. The
 * one thing on the site nobody had typeset was the thing people come to read.
 *
 * Noto Serif Devanagari is Fraunces' closest companion in weight and warmth
 * and carries the full conjunct set. `latin` rides along so mixed runs
 * ("2.47 · भगवद्गीता") do not swap faces mid-line.
 */
const devanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-devanagari",
});

/**
 * Absolute URLs (canonical, og:url, og:image) resolve against the canonical
 * origin — the brand domain in production, mind-dev on the dev deployment.
 * See lib/site.ts for why a legacy or local SITE_URL is never trusted here.
 */
const SITE_DESCRIPTION =
  "Read all 701 Bhagavad Gita verses in Sanskrit, Hindi and English with word meanings, find verses for how you feel, see today's Panchang, and ask Madhav.";

export const metadata: Metadata = {
  metadataBase: new URL(configuredSiteOrigin()),
  title: {
    default: "MindKshetra — Bhagavad Gita verses, meanings and daily guidance",
    template: "%s · MindKshetra",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      /* Lets Next disable smooth scroll during App Router navigations so new
         pages land at the top instead of animating from the previous Y. */
      data-scroll-behavior="smooth"
      /* The script above rewrites data-theme before hydration, so the server's
         "dark" and the client's actual value legitimately differ on <html>. */
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${devanagari.variable}`}
    >
      <head>
        {/* Runs before first paint, before React, before anything else in the
            document. data-theme was hardcoded "dark" and ThemeProvider fixed it
            in a useEffect — after hydration — so every light-mode reader opened
            every page with a full-contrast dark flash and a hard swap. React
            cannot fix that: the answer is in localStorage, which the server
            cannot read, so the read happens in the document itself. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              {/* First focusable element in the document, by design. */}
              <SkipLink />
              <ProgressProvider>
                <div className="site-atmosphere" aria-hidden />
                <NavigationProgress />
                <Nav />
                <WelcomeGate />
                <MainShell>{children}</MainShell>
                <SiteFooter />
              </ProgressProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
