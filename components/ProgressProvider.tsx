"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  clearGuestProgress,
  getGuestCompletedIds,
  getGuestCursor,
  guestProgressPayload,
  setGuestCompleted,
  setGuestCompletedBulk,
  setGuestCursor,
} from "@/lib/guest-progress";

type ProgressContextValue = {
  loading: boolean;
  completedIds: Set<number>;
  cursorSlokaId: number | null;
  continueSlokaId: number | null;
  isComplete: (slokaId: number) => boolean;
  markComplete: (slokaId: number, completed: boolean) => Promise<void>;
  markManyComplete: (slokaIds: number[], completed: boolean) => Promise<void>;
  recordOpen: (slokaId: number, chapter: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

function useSignedIn() {
  const { user } = useAuth();
  return Boolean(user && !user.is_anonymous);
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const signedIn = useSignedIn();
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [cursorSlokaId, setCursorSlokaId] = useState<number | null>(null);
  const [continueSlokaId, setContinueSlokaId] = useState<number | null>(null);

  const applyGuest = useCallback(async () => {
    const cursor = getGuestCursor();
    const ids = getGuestCompletedIds();
    setCompletedIds(ids);
    setCursorSlokaId(cursor?.slokaId ?? null);
    if (!cursor?.slokaId) {
      setContinueSlokaId(null);
      return;
    }
    try {
      const res = await fetch("/api/progress/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cursorSlokaId: cursor.slokaId,
          completedIds: ids,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setContinueSlokaId(data.continueSlokaId ?? cursor.slokaId);
        return;
      }
    } catch {
      /* fall through */
    }
    setContinueSlokaId(cursor.slokaId);
  }, []);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      await applyGuest();
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/progress");
      if (!res.ok) {
        await applyGuest();
        return;
      }
      const data = await res.json();
      setCompletedIds(
        Array.isArray(data.completedIds) ? data.completedIds.map(Number) : []
      );
      setCursorSlokaId(data.cursor?.slokaId ?? null);
      setContinueSlokaId(data.continueSlokaId ?? data.cursor?.slokaId ?? null);
    } catch {
      await applyGuest();
    } finally {
      setLoading(false);
    }
  }, [signedIn, applyGuest]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  // Merge guest → DB when signing in
  useEffect(() => {
    if (!signedIn || typeof window === "undefined") return;
    const payload = guestProgressPayload();
    if (!payload.cursor && !payload.completedIds.length) return;
    void (async () => {
      try {
        const res = await fetch("/api/progress/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          clearGuestProgress();
          await refresh();
        }
      } catch {
        /* ignore */
      }
    })();
  }, [signedIn, refresh, user?.id]);

  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);

  const isComplete = useCallback(
    (slokaId: number) => completedSet.has(slokaId),
    [completedSet]
  );

  const markComplete = useCallback(
    async (slokaId: number, completed: boolean) => {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (completed) next.add(slokaId);
        else next.delete(slokaId);
        return Array.from(next);
      });

      if (signedIn) {
        try {
          await fetch("/api/progress/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slokaId, completed }),
          });
          await refresh();
        } catch {
          /* ignore */
        }
      } else {
        setGuestCompleted(slokaId, completed);
        await applyGuest();
      }
    },
    [signedIn, refresh, applyGuest]
  );

  const markManyComplete = useCallback(
    async (slokaIds: number[], completed: boolean) => {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        for (const id of slokaIds) {
          if (completed) next.add(id);
          else next.delete(id);
        }
        return Array.from(next);
      });

      if (signedIn) {
        try {
          await fetch("/api/progress/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slokaIds, completed }),
          });
          await refresh();
        } catch {
          /* ignore */
        }
      } else {
        setGuestCompletedBulk(slokaIds, completed);
        await applyGuest();
      }
    },
    [signedIn, refresh, applyGuest]
  );

  const recordOpen = useCallback(
    async (slokaId: number, chapter: number) => {
      setCursorSlokaId(slokaId);
      setContinueSlokaId(slokaId);

      if (signedIn) {
        try {
          await fetch("/api/progress/cursor", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slokaId }),
          });
        } catch {
          /* ignore */
        }
      } else {
        setGuestCursor(slokaId, chapter);
      }
    },
    [signedIn]
  );

  const value = useMemo<ProgressContextValue>(
    () => ({
      loading,
      completedIds: completedSet,
      cursorSlokaId,
      continueSlokaId,
      isComplete,
      markComplete,
      markManyComplete,
      recordOpen,
      refresh,
    }),
    [
      loading,
      completedSet,
      cursorSlokaId,
      continueSlokaId,
      isComplete,
      markComplete,
      markManyComplete,
      recordOpen,
      refresh,
    ]
  );

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used within ProgressProvider");
  }
  return ctx;
}
