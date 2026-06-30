"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: "home" | "plus" | "user" };

const ICONS: Record<Tab["icon"], (active: boolean) => React.ReactNode> = {
  home: (a) => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <path d="M3 9 L10 3 L17 9 V17 H3 Z" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  plus: (a) => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <path d="M10 4 V16 M4 10 H16" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
  user: (a) => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="6.5" r="3" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" />
      <path d="M3.5 17 c0-3.6 3-5.5 6.5-5.5 s6.5 1.9 6.5 5.5" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" />
    </svg>
  ),
};

const DEFAULT_TABS: Tab[] = [
  { href: "/director", label: "Home", icon: "home" },
  { href: "/director/new", label: "New", icon: "plus" },
  { href: "/director/account", label: "Account", icon: "user" },
];

export function TabBar({ tabs = DEFAULT_TABS }: { tabs?: Tab[] }) {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 flex items-center bg-ink px-2 pt-3 pb-6 md:order-first md:bottom-auto md:top-0 md:gap-2 md:px-6 md:py-3.5">
      <Link href="/director" className="mr-auto hidden md:block display text-[16px] tracking-[1.5px] text-white">
        TOURNAMENTPAL
      </Link>
      {tabs.map((t) => {
        const active = t.href === "/director" ? pathname === "/director" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className="flex flex-1 flex-col items-center gap-1.5 md:flex-none md:flex-row md:gap-2 md:rounded-full md:px-4 md:py-2"
          >
            {ICONS[t.icon](active)}
            <span
              className="display text-[10px] tracking-widest md:text-[12px]"
              style={{ color: active ? "#facc15" : "#7a7a7a" }}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
