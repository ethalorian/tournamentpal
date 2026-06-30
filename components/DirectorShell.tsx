import Link from "next/link";
import type { ReactNode } from "react";
import { TabBar } from "./TabBar";

/**
 * The phone-width app frame used across the signed-in director area:
 * scrollable content + a sticky bottom tab bar.
 */
export function DirectorShell({
  children,
  showTabs = true,
}: {
  children: ReactNode;
  showTabs?: boolean;
}) {
  return (
    <div className="app-shell flex flex-col md:my-6 md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-3xl md:border md:border-ink/10 md:shadow-[0_24px_60px_rgba(20,24,40,.12)]">
      <div className="flex-1 px-5 pb-6 pt-6 md:px-9 md:pt-8">{children}</div>
      {showTabs && <TabBar />}
    </div>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white">
      <span className="display text-[15px]">{initials}</span>
    </div>
  );
}

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M12 4 L6 10 L12 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}
