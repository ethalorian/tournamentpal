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
    <div className="app-shell flex flex-col">
      <header className="flex items-center justify-between bg-ink px-5 py-3.5 text-white">
        <Link href={`/t/${id}`} className="display text-[15px] tracking-[1.5px]">
          TOURNAMENTPAL
        </Link>
        {dayLabel && <span className="display text-[13px] tracking-[1.5px] text-accent">{dayLabel}</span>}
      </header>
      <div className="flex-1 px-5 pb-6 pt-5">
        <div className="mb-4">
          <h1 className="display text-[22px] leading-tight">{tournamentName}</h1>
        </div>
        {children}
      </div>
      <FollowerNav id={id} />
    </div>
  );
}
