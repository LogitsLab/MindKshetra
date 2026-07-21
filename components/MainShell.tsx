"use client";

import { usePathname } from "next/navigation";

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname === "/madhav";

  return (
    <main
      className={
        fullBleed
          ? "relative flex h-[calc(100dvh-4rem)] min-h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden p-0"
          : "relative mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-6xl px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-8"
      }
    >
      {children}
    </main>
  );
}
