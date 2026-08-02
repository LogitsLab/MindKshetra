"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearGuestJourney,
  readAllGuestJourneys,
} from "@/lib/journeys/local";
import { createClient } from "@/lib/supabase/client";
import { supabaseBrowserConfigured } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type AuthResult = { error?: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInAnonymously: () => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithEmail: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const CHAT_SESSION_KEY = "mindkshetra-chat-session";

function friendlyAuthError(message: string, kind: "anonymous" | "google" | "email") {
  const lower = message.toLowerCase();
  if (kind === "anonymous" && (lower.includes("disabled") || lower.includes("not enabled"))) {
    return "Guest sign-in is not enabled yet. Use email below, or enable Anonymous in Supabase Auth → Providers.";
  }
  if (
    kind === "google" &&
    (lower.includes("not enabled") || lower.includes("unsupported"))
  ) {
    return "Google sign-in is not set up. Use the email magic link instead.";
  }
  if (
    kind === "email" &&
    (lower.includes("rate") ||
      lower.includes("too many") ||
      lower.includes("security purposes") ||
      lower.includes("wait a minute"))
  ) {
    return "Sign-in email limit reached (default Supabase mail allows only a couple per hour). Check inbox/spam for an earlier link, or wait up to an hour — then try once.";
  }
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = supabaseBrowserConfigured();
  const supabase = useMemo(() => {
    if (!configured) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, [configured]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Supabase Site URL failures land on / with ?code= / ?error= / #error=.
    // Middleware usually catches ?code=; this is the client-side safety net.
    const url = new URL(window.location.href);
    if (url.pathname.startsWith("/auth/callback")) return;

    const code = url.searchParams.get("code");
    if (code) {
      const isLocalHost = /localhost|127\.0\.0\.1/.test(url.hostname);
      const hasVerifier = document.cookie.includes("code-verifier");
      const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(
        /\/$/,
        ""
      );
      const productionOrigin =
        configured && !/localhost|127\.0\.0\.1/.test(configured)
          ? configured
          : "https://mind.logitslab.com";

      // OAuth started on production but Supabase bounced to localhost.
      if (isLocalHost && !hasVerifier) {
        const dest = new URL("/auth/callback", productionOrigin);
        url.searchParams.forEach((value, key) => {
          dest.searchParams.set(key, value);
        });
        if (!dest.searchParams.has("next")) {
          dest.searchParams.set("next", "/account");
        }
        window.location.replace(dest.toString());
        return;
      }

      const callback = new URL("/auth/callback", window.location.origin);
      url.searchParams.forEach((value, key) => {
        callback.searchParams.set(key, value);
      });
      if (!callback.searchParams.has("next")) {
        callback.searchParams.set("next", "/account");
      }
      window.location.replace(callback.toString());
      return;
    }

    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const errorCode =
      url.searchParams.get("error_code") ||
      hashParams.get("error_code") ||
      "";
    const error =
      url.searchParams.get("error") || hashParams.get("error") || "";

    if (
      errorCode === "otp_expired" ||
      (error === "access_denied" &&
        (errorCode === "otp_expired" ||
          (url.searchParams.get("error_description") ||
            hashParams.get("error_description") ||
            ""
          ).toLowerCase().includes("expired")))
    ) {
      window.location.replace("/account?auth_error=otp_expired");
      return;
    }

    if (error === "access_denied" || errorCode) {
      window.location.replace("/account?auth_error=auth_failed");
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser && typeof window !== "undefined") {
        const sessionId = localStorage.getItem(CHAT_SESSION_KEY);
        if (sessionId) {
          try {
            await fetch("/api/chat/merge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });
          } catch {
            /* ignore */
          }
        }

        // Anonymous sessions are excluded deliberately: /api/journeys/merge
        // accepts them but /api/journeys/[id]/run does not, so merging under
        // an anonymous id then clearing the device copy made a guest's days
        // unreadable — visible progress simply vanished. Every other merge in
        // the app guards the same way.
        // Journeys replay on sign-in, like chat, progress, sadhana and
        // meditation before it. Without this a guest's week of practice was
        // still on the device and never reached the account — the endpoint
        // existed and nothing called it.
        const journeys = nextUser.is_anonymous ? [] : readAllGuestJourneys();
        if (journeys.length) {
          try {
            const res = await fetch("/api/journeys/merge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ journeys }),
            });
            // Only clear once the server has them; a failed replay must stay
            // on the device to be retried at the next sign-in.
            if (res.ok) {
              for (const j of journeys) clearGuestJourney(j.journeyId);
            }
          } catch {
            /* keep the local copy */
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInAnonymously = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("[auth] anonymous", error.message);
      return { error: friendlyAuthError(error.message, "anonymous") };
    }
    return {};
  }, [supabase]);

  const authCallbackUrl = useCallback((next = "/account") => {
    const url = new URL("/auth/callback", window.location.origin);
    // Omit default next so Supabase Redirect URL allowlist can match the
    // path exactly (`…/auth/callback`). Callback defaults next → /account.
    if (next && next !== "/account") {
      url.searchParams.set("next", next);
    }
    return url.toString();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl("/account") },
    });
    if (error) {
      console.error("[auth] google", error.message);
      return { error: friendlyAuthError(error.message, "google") };
    }
    return {};
  }, [supabase, authCallbackUrl]);

  const signInWithEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!supabase) return { error: "Auth is not configured." };
      if (!email.includes("@")) return { error: "Enter a valid email address." };
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: authCallbackUrl("/account") },
      });
      if (error) {
        console.error("[auth] email", error.message);
        return { error: friendlyAuthError(error.message, "email") };
      }
      return {};
    },
    [supabase, authCallbackUrl]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured,
      signInAnonymously,
      signInWithGoogle,
      signInWithEmail,
      signOut,
    }),
    [
      user,
      loading,
      configured,
      signInAnonymously,
      signInWithGoogle,
      signInWithEmail,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { CHAT_SESSION_KEY };
