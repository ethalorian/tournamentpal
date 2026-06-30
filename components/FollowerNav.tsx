"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { seg: string; label: string; icon: "live" | "cal" | "table" | "pin" };

const ICONS: Record<Tab["icon"], (a: boolean) => React.ReactNode> = {
  live: (a) => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="3" fill={a ? "#facc15" : "#7a7a7a"} />
      <circle cx="10" cy="10" r="7" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" />
    </svg>
  ),
  cal: (a) => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" />
      <path d="M3 8 H17 M7 2 V5 M13 2 V5" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  table: (a) => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" />
      <path d="M3 9 H17 M3 13 H17 M9 4 V16" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="1.6" />
    </svg>
  ),
  pin: (a) => (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <path d="M10 18 C10 18 16 12.5 16 8 A6 6 0 0 0 4 8 C4 12.5 10 18 10 18 Z" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="10" cy="8" r="2" stroke={a ? "#facc15" : "#7a7a7a"} strokeWidth="2" />
    </svg>
  ),
};

export function FollowerNav({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/t/${id}`;
  const tabs: Tab[] = [
    { seg: "", label: "Live", icon: "live" },
    { seg: "/schedule", label: "Schedule", icon: "cal" },
    { seg: "/standings", label: "Standings", icon: "table" },
    { seg: "/directions", label: "Directions", icon: "pin" },
  ];
  return (
    <nav className="sticky bottom-0 z-30 flex bg-ink px-2 pt-3 pb-6 md:order-2 md:bottom-auto md:justify-center md:gap-2 md:border-t md:border-white/10 md:pb-3">
      {tabs.map((t) => {
        const href = base + t.seg;
        const active = t.seg === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={t.label}
            href={href}
            className="flex flex-1 flex-col items-center gap-1.5 md:flex-none md:flex-row md:gap-2 md:rounded-full md:px-5 md:py-2"
          >
            {ICONS[t.icon](active)}
            <span className="display text-[10px] tracking-widest md:text-[12px]" style={{ color: active ? "#facc15" : "#7a7a7a" }}>
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
