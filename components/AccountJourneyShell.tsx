"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/account", label: "Profile", icon: "◌" },
  { href: "/account/personalize", label: "Personalize", icon: "◇" },
  { href: "/account/achievements", label: "Achievements", icon: "✦" },
  { href: "/account/progress", label: "Progress", icon: "◔" },
] as const;

export default function AccountJourneyShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="grid min-h-[calc(100dvh-8rem)] overflow-hidden border border-[var(--line)] bg-[rgba(7,9,15,.52)] md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="border-b border-[var(--hairline)] bg-[rgba(14,20,32,.84)] p-4 md:border-b-0 md:border-r md:border-[var(--hairline)] md:p-6">
        <div className="border-b border-[var(--hairline)] pb-6">
          <p className="font-display text-xl text-[var(--brass-soft)]">
            Your Journey
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Private seeker path
          </p>
        </div>
        <nav className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-1">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/account" && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm transition ${
                  active
                    ? "border border-[var(--line)] bg-[rgba(201,162,39,.1)] text-[var(--brass-soft)]"
                    : "border border-transparent text-[var(--text-muted)] hover:bg-white/[.04] hover:text-[var(--text)]"
                }`}
              >
                <span aria-hidden>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <p className="mt-8 hidden border-t border-[var(--hairline)] pt-5 font-devanagari text-sm italic leading-relaxed text-[var(--text-muted)] md:block">
          ॐ शान्तिः शान्तिः शान्तिः
        </p>
      </aside>
      <div className="relative min-w-0 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[var(--teal-glow)]/[.06] blur-[110px]" />
        <div className="relative p-5 sm:p-8 lg:p-12">{children}</div>
      </div>
    </div>
  );
}
