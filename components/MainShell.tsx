"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed =
    pathname === "/" || pathname === "/madhav" || pathname === "/welcome";

  // Belt-and-suspenders with data-scroll-behavior on <html>: soft-nav from a
  // scrolled Home can still leave window.scrollY mid-page when Suspense swaps
  // content under a smooth-scroll rule.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <main
      id="main-content"
      /* -1 so the skip link moves FOCUS here, not just the scroll position —
         without it the next Tab lands back at the top of the nav. Not in the
         tab order otherwise. */
      tabIndex={-1}
      className={
        fullBleed
          ? `relative flex w-full flex-col overflow-hidden p-0 focus-visible:outline-none ${
              pathname === "/madhav"
                ? "h-[calc(100dvh-4rem)] min-h-[calc(100dvh-4rem)]"
                : "min-h-[calc(100dvh-4rem)]"
            }`
          : "relative mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-6xl px-4 pb-12 pt-5 focus-visible:outline-none sm:px-6 sm:pb-16 sm:pt-8"
      }
    >
      {children}
    </main>
  );
}
