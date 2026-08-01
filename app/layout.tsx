import type { Metadata } from "next";
import { Fraunces, Noto_Serif_Devanagari, Sora } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ProgressProvider } from "@/components/ProgressProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import Nav from "@/components/Nav";
import MainShell from "@/components/MainShell";
import SiteFooter from "@/components/SiteFooter";
import NavigationProgress from "@/components/NavigationProgress";
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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "MindKshetra",
  description:
    "Clarity from the Gita, for the battlefield of the mind. Explore verses, match your mood, and talk with Madhav.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/mark.svg" }],
  },
  openGraph: {
    title: "MindKshetra",
    description:
      "Clarity from the Gita, for the battlefield of the mind. Explore verses, match your mood, and talk with Madhav.",
    images: [
      {
        url: "/images/og.jpg",
        width: 1200,
        height: 630,
        alt: "MindKshetra",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MindKshetra",
    description: "Clarity from the Gita, for the battlefield of the mind.",
    images: ["/images/og.jpg"],
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
      className={`${display.variable} ${body.variable} ${devanagari.variable}`}
    >
      <body className="font-body antialiased">
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <ProgressProvider>
                <div className="site-atmosphere" aria-hidden />
                <NavigationProgress />
                <Nav />
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
