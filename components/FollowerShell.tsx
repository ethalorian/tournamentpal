import Link from "next/link";
import type { ReactNode } from "react";
import { FollowerNav } from "./FollowerNav";

/**
 * Public follower frame: a dark TournamentPal bar, scrollable content, and a
 * sticky bottom nav. No auth required to view.
 */
export function FollowerShell({
  id,
  tournamentName,
  dayLabel,
  children,
}: {
  id: string;
  tournamentName: string;
  dayLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell flex flex-col md:my-6 md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-3xl md:border md:border-ink/10 md:shadow-[0_24px_60px_rgba(20,24,40,.12)]">
      <header className="flex items-center justify-between bg-ink px-5 py-3.5 text-white md:order-1 md:px-9 md:py-4">
        <Link href={`/t/${id}`} className="display text-[15px] tracking-[1.5px] md:text-[18px]">
          TOURNAMENTPAL
        </Link>
        {dayLabel && <span className="display text-[13px] tracking-[1.5px] text-accent md:text-[15px]">{dayLabel}</span>}
      </header>
      <div className="flex-1 px-5 pb-6 pt-5 md:order-3 md:px-9 md:pt-7">
        <div className="mb-4">
          <h1 className="display text-[22px] leading-tight md:text-[28px]">{tournamentName}</h1>
        </div>
        {children}
      </div>
      <FollowerNav id={id} />
    </div>
  );
}
