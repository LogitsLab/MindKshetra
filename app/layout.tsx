import type { Metadata } from "next";
import { Fraunces, Sora } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import Nav from "@/components/Nav";
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
      { url: "/images/og.png", width: 1200, height: 630, alt: "MindKshetra" },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MindKshetra",
    description: "Clarity from the Gita, for the battlefield of the mind.",
    images: ["/images/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body antialiased">
        <LanguageProvider>
          <div className="site-atmosphere" aria-hidden />
          <Nav />
          <main className="relative mx-auto min-h-[calc(100vh-64px)] w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  );
}
