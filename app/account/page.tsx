"use client";

import AccountJourneyShell from "@/components/AccountJourneyShell";
import AccountPageClient from "@/components/AccountPageClient";
import { useAuth } from "@/components/AuthProvider";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const signedIn = Boolean(user && !user.is_anonymous);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-[var(--text-muted)]">
        …
      </main>
    );
  }

  if (!signedIn) {
    return <AccountPageClient />;
  }

  return (
    <AccountJourneyShell>
      <AccountPageClient />
    </AccountJourneyShell>
  );
}
