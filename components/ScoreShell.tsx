import Link from "next/link";
import type { ReactNode } from "react";

const PANEL =
  "app-shell flex flex-col md:my-6 md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-3xl md:border md:border-ink/10 md:shadow-[0_24px_60px_rgba(20,24,40,.12)]";

export function ScoreShell({ children }: { children: ReactNode }) {
  return (
    <div className={PANEL}>
      <header className="flex items-center justify-between bg-ink px-5 py-3.5 text-white md:px-9 md:py-4">
        <Link href="/score" className="display text-[15px] tracking-[1.5px] md:text-[18px]">
          TOURNAMENTPAL
        </Link>
        <span className="display text-[12px] tracking-[1.5px] text-accent">SCOREKEEPER</span>
      </header>
      <div className="flex-1 px-5 pb-10 pt-6 md:px-9 md:pt-8">{children}</div>
    </div>
  );
}
