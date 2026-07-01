import Link from "next/link";
import type { ReactNode } from "react";
import { FollowerNav } from "./FollowerNav";
import { BackLink } from "./DirectorShell";

/**
 * Public follower frame: a dark TournamentPal bar, scrollable content, and a
 * sticky bottom nav. No auth required to view.
 */
export function FollowerShell({
  id,
  tournamentName,
  dayLabel,
  hold,
  backHref,
  backLabel,
  children,
}: {
  id: string;
  tournamentName: string;
  dayLabel?: string;
  hold?: { status: string | null; note: string | null; until: string | null };
  backHref?: string;
  backLabel?: string;
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
        {hold?.status && <HoldBanner status={hold.status} note={hold.note} until={hold.until} />}
        {backHref && (
          <div className="mb-3">
            <BackLink href={backHref} label={backLabel ?? "Back"} />
          </div>
        )}
        <div className="mb-4">
          <h1 className="display text-[22px] leading-tight md:text-[28px]">{tournamentName}</h1>
        </div>
        {children}
      </div>
      <FollowerNav id={id} />
    </div>
  );
}

const HOLD_LABEL: Record<string, string> = {
  hold: "Play on hold",
  delay: "Games delayed",
  postponed: "Games postponed",
  cancelled: "Games cancelled",
};

function HoldBanner({ status, note, until }: { status: string; note: string | null; until: string | null }) {
  return (
    <div className="mb-4 rounded-2xl border-2 border-danger bg-danger/10 p-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
        <span className="display text-[15px] text-danger">{HOLD_LABEL[status] ?? "Play update"}</span>
      </div>
      {note && <p className="mt-1.5 text-[13px] font-semibold text-ink">{note}</p>}
      {until && (
        <p className="mt-1 text-[12px] text-muted">
          Estimated resume ~
          {new Date(until).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
