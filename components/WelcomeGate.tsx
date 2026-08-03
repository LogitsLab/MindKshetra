"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const WELCOME_KEY = "mindkshetra-welcome-seen";

/**
 * Soft first-visit offer for optional personalization.
 * Only redirects bare `/` once; deep links and return visits are untouched.
 * Home itself stays the full companion hub after Continue.
 */
export default function WelcomeGate() {
  const router = useRouter();

  useEffect(() => {
    try {
      if (localStorage.getItem(WELCOME_KEY) === "1") return;
      if (window.location.pathname !== "/") return;
      router.replace("/welcome");
    } catch {
      /* ignore */
    }
  }, [router]);

  return null;
}
