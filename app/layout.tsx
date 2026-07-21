import type { Metadata } from "next";
import { Fraunces, Sora } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
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
      { url: "/images/og.jpg", width: 1200, height: 630, alt: "MindKshetra" },
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
      className={`${display.variable} ${body.variable}`}
    >
      <body className="font-body antialiased">
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <div className="site-atmosphere" aria-hidden />
              <Nav />
              <main className="relative mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-6xl px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-8">
                {children}
              </main>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
