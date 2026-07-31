import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HANDLE_SHAPE } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile · MindKshetra",
};

/**
 * Public profile — deliberately quiet. A name, a line, since-when. No
 * activity feed, no streak numbers, no follower counts: presence without
 * performance.
 */
export default async function ProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const handle = params.handle?.toLowerCase();
  if (!handle || !HANDLE_SHAPE.test(handle)) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("handle, display_name, bio, avatar_key, created_at")
    .eq("handle", handle)
    .eq("is_public", true)
    .maybeSingle();

  if (!profile) notFound();

  const since = new Date(profile.created_at as string).toLocaleDateString(
    "en-IN",
    { year: "numeric", month: "long" }
  );

  return (
    <div className="animate-fade mx-auto max-w-xl py-6 sm:py-10">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--brass-soft)]">
        Seeker
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-4xl">
        {profile.display_name || `@${profile.handle}`}
      </h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">@{profile.handle}</p>
      {profile.bio ? (
        <p className="mt-6 border-l-2 border-[var(--brass)]/50 pl-4 text-[15px] font-light leading-relaxed text-[var(--text-muted)]">
          {profile.bio}
        </p>
      ) : null}
      <p className="mt-8 border-t border-[var(--hairline)] pt-4 text-xs text-[var(--text-muted)]">
        Walking the field since {since}
      </p>
    </div>
  );
}
