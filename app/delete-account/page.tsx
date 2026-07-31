import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Account · MindKshetra",
  description:
    "How to request deletion of your MindKshetra account and associated data.",
};

const updated = "29 July 2026";

export default function DeleteAccountPage() {
  return (
    <article className="mx-auto max-w-2xl animate-fade py-6 sm:py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
        MindKshetra · LogitsLab
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
        Delete your account
      </h1>
      <p className="mt-4 text-sm text-[var(--text-muted)]">
        Request deletion of your MindKshetra account (website and mobile apps).
        Last updated {updated}.
      </p>

      <section className="mt-12 space-y-3 border-t border-[var(--hairline)] pt-10">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Delete it yourself (immediate)
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          Signed-in users can delete their account and all data instantly from{" "}
          <Link
            href="/account"
            className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            Account → Delete account
          </Link>{" "}
          on the website, or from Profile → Delete account in the mobile app.
          Deletion is permanent and takes effect immediately.
        </p>
      </section>

      <section className="mt-12 space-y-3 border-t border-[var(--hairline)] pt-10">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Or request deletion by email
        </h2>
        <ol className="list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-[var(--text-muted)]">
          <li>
            Email{" "}
            <a
              href="mailto:info@logitslab.com?subject=MindKshetra%20account%20deletion"
              className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
            >
              info@logitslab.com
            </a>{" "}
            from the same email address used for your MindKshetra account
            (Google / Apple / magic-link login).
          </li>
          <li>
            Use the subject line{" "}
            <span className="text-[var(--text)]">
              “MindKshetra account deletion”
            </span>{" "}
            and include the email or provider used to sign in.
          </li>
          <li>
            We will verify ownership and delete your account and associated data
            within <span className="text-[var(--text)]">30 days</span> of a
            verified request.
          </li>
          <li>
            You will receive a confirmation email when deletion is complete.
          </li>
        </ol>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          Guest (anonymous) sessions are not full accounts. Clear the app or
          sign out to discard local guest data; server-side guest data, if any,
          is removed on the same schedule when you request it.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          What we delete
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--text-muted)]">
          <li>Account identity (email / OAuth links) and session tokens</li>
          <li>Profile fields you saved (name, birth details used for charts, etc.)</li>
          <li>Favorites, journal reflections, reading progress, and streaks</li>
          <li>Madhav chat history tied to your account</li>
          <li>Saved astrology members / charts</li>
          <li>Email preference records (e.g. Verse of the Day opt-in)</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          What we may keep
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--text-muted)]">
          <li>
            Limited security / abuse-prevention logs for a short period as
            required to operate the service safely
          </li>
          <li>
            Records we must retain to comply with law, resolve disputes, or
            enforce our terms
          </li>
          <li>
            Aggregated or de-identified analytics that cannot reasonably identify
            you
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3 border-t border-[var(--hairline)] pt-10">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Contact
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          MindKshetra by LogitsLab —{" "}
          <a
            href="mailto:info@logitslab.com"
            className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            info@logitslab.com
          </a>
        </p>
        <p className="pt-4 text-sm text-[var(--text-muted)]">
          <Link
            href="/privacy"
            className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            Privacy policy
          </Link>
          {" · "}
          <Link
            href="/"
            className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            Home
          </Link>
        </p>
      </section>
    </article>
  );
}
