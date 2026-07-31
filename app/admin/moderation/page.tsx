import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ModerationQueueClient from "@/components/ModerationQueueClient";
import { isMaintainer } from "@/lib/maintainers";
import { getSignedInUserId } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderation · MindKshetra",
  robots: { index: false, follow: false },
};

export default async function ModerationPage() {
  const userId = await getSignedInUserId();
  if (!isMaintainer(userId)) notFound();

  return (
    <div className="animate-fade mx-auto max-w-2xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
          Maintainers
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)]">
          Review queue
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Humans decide. Screening and triage only prioritize. Removal hides a
          shared reflection from the verse page — it never touches the
          author&rsquo;s private journal.
        </p>
      </header>
      <ModerationQueueClient />
    </div>
  );
}
