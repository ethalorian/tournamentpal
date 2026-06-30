"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: "home" | "chat" | "grid"; badge?: number };

const ICONS: Record<Tab["icon"], (a: boolean) => React.ReactNode> = {
  home: (a) => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <path d="M3 9 L10 3 L17 9 V17 H3 Z" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  chat: (a) => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <path d="M3 5 h14 v8 h-8 l-4 3 v-3 h-2 Z" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  grid: (a) => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1.5" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" />
    </svg>
  ),
};

export function ManagerNav({ teamId, unread = 0 }: { teamId: string; unread?: number }) {
  const pathname = usePathname();
  const base = `/manager/${teamId}`;
  const tabs: Tab[] = [
    { href: base, label: "Home", icon: "home" },
    { href: `${base}/messages`, label: "Messages", icon: "chat", badge: unread },
    { href: "/manager", label: "Teams", icon: "grid" },
  ];
  return (
    <nav className="sticky bottom-0 z-30 flex bg-ink px-2 pt-3 pb-6 md:order-first md:bottom-auto md:top-0 md:justify-center md:gap-2 md:py-3.5">
      {tabs.map((t) => {
        const active = t.href === "/manager" ? pathname === "/manager" : pathname === t.href;
        return (
          <Link
            key={t.label}
            href={t.href}
            className="relative flex flex-1 flex-col items-center gap-1.5 md:flex-none md:flex-row md:gap-2 md:px-5"
          >
            {ICONS[t.icon](active)}
            {t.badge ? (
              <span className="absolute right-[26%] top-[-4px] flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white md:right-2">
                {t.badge}
              </span>
            ) : null}
            <span className="display text-[10px] tracking-widest md:text-[12px]" style={{ color: active ? "#facc15" : "#7a7a7a" }}>
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
