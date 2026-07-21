"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  if (kind === "email" && lower.includes("rate")) {
    return "Too many attempts. Wait a minute and try again.";
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

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth is not configured." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      console.error("[auth] google", error.message);
      return { error: friendlyAuthError(error.message, "google") };
    }
    return {};
  }, [supabase]);

  const signInWithEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!supabase) return { error: "Auth is not configured." };
      if (!email.includes("@")) return { error: "Enter a valid email address." };
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/account` },
      });
      if (error) {
        console.error("[auth] email", error.message);
        return { error: friendlyAuthError(error.message, "email") };
      }
      return {};
    },
    [supabase]
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
