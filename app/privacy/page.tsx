import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · MindKshetra",
  description:
    "How MindKshetra collects, uses, and protects data on web and mobile.",
};

const updated = "29 July 2026";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl animate-fade py-6 sm:py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--brass)]">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
        Privacy Policy
      </h1>
      <p className="mt-4 text-sm text-[var(--text-muted)]">
        Applies to the MindKshetra website and mobile apps. Last updated{" "}
        {updated}.
      </p>
      <p className="mt-6 text-[15px] leading-relaxed text-[var(--text-muted)]">
        MindKshetra (“we”, “us”) is a Bhagavad Gita reading companion with
        optional chat and astrology features. This policy explains what we
        collect, why, and how you control it. We do not sell personal data.
      </p>

      <section className="mt-12 space-y-3 border-t border-[var(--hairline)] pt-10">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Who this covers
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          Use of{" "}
          <a
            href="https://mind.logitslab.com"
            className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            mind.logitslab.com
          </a>
          , related domains, and the MindKshetra iOS / Android apps. Web and
          mobile share the same account and backend.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Information we process
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--text-muted)]">
          <li>
            <span className="text-[var(--text)]">Account.</span> Email and/or
            OAuth identity (e.g. Google) via Supabase Auth. You may also use a
            guest (anonymous) session with limited sync.
          </li>
          <li>
            <span className="text-[var(--text)]">Profile (optional).</span>{" "}
            Display name, date of birth, place, preferred language, and short
            about text you save in Account settings.
          </li>
          <li>
            <span className="text-[var(--text)]">Reading data.</span> Favorites,
            journal reflections, reading progress, and streak.
          </li>
          <li>
            <span className="text-[var(--text)]">Chat.</span> Messages you send
            to Madhav and related conversation context, processed by our API and
            language-model providers to generate replies.
          </li>
          <li>
            <span className="text-[var(--text)]">Astrology.</span> Birth details
            you enter for chart computation; saved only if you choose to store a
            member/chart.
          </li>
          <li>
            <span className="text-[var(--text)]">Email preferences.</span> Whether
            you receive Verse of the Day emails (on by default until you turn
            them off).
          </li>
          <li>
            <span className="text-[var(--text)]">Technical data.</span> Basic
            server logs (IP, user agent, timestamps) and cookies/session tokens
            needed for sign-in and security.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          How we use it
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--text-muted)]">
          <li>Provide reading, chat, astrology, and account sync across devices</li>
          <li>Send Verse of the Day or transactional auth emails you request</li>
          <li>Secure the service, prevent abuse, and debug failures</li>
          <li>Improve the product using aggregated or de-identified signals where practical</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Service providers
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          We use processors solely to run MindKshetra, including:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--text-muted)]">
          <li>Supabase — authentication and database</li>
          <li>Vercel — web hosting and scheduled jobs</li>
          <li>Resend — transactional and Verse of the Day email</li>
          <li>LLM / AI providers — generating Madhav replies and related content</li>
        </ul>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          They process data under their own terms, only as needed for these
          purposes. We do not sell personal information or share it for
          third-party advertising.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Cookies and sessions
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          We use cookies and similar storage for authentication (including PKCE
          for magic links), preferences such as theme/language, and essential
          site operation. We do not use third-party ad trackers on the core
          reading experience.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Your choices
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--text-muted)]">
          <li>Sign out or stop using guest mode at any time</li>
          <li>Turn off Verse of the Day emails in Account settings</li>
          <li>Export your account data from Account (where available)</li>
          <li>Delete saved astrology members or journal content you no longer want</li>
          <li>
            Request account deletion or data access — see{" "}
            <Link
              href="/delete-account"
              className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
            >
              Delete your account
            </Link>{" "}
            or email{" "}
            <a
              href="mailto:info@logitslab.com"
              className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
            >
              info@logitslab.com
            </a>
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Children
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          MindKshetra is not directed at children under 13 (or the minimum age
          required in your region). Do not create an account if you are under
          that age.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Retention and security
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          We keep account and content data while your account is active and as
          needed to provide the service, comply with law, or resolve disputes.
          We use industry-standard safeguards (HTTPS, access-controlled
          databases). No method of transmission or storage is perfectly secure.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          International transfers
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          Providers may process data in the United States or other countries.
          By using MindKshetra you understand that your information may be
          transferred to those locations.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Changes
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          We may update this policy. The “Last updated” date will change when we
          do. Continued use after changes means you accept the revised policy.
        </p>
      </section>

      <section className="mt-10 space-y-3 border-t border-[var(--hairline)] pt-10">
        <h2 className="font-display text-2xl font-semibold text-[var(--text)]">
          Contact
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
          Questions or requests:{" "}
          <a
            href="mailto:info@logitslab.com"
            className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            info@logitslab.com
          </a>
          .
        </p>
        <p className="pt-4 text-sm text-[var(--text-muted)]">
          <Link
            href="/account"
            className="text-[var(--brass-soft)] underline-offset-2 hover:underline"
          >
            ← Back to Account
          </Link>
        </p>
      </section>
    </article>
  );
}
