import Link from "next/link";

export const metadata = { title: "Offline — TournamentPal" };

export default function Offline() {
  return (
    <div className="app-shell flex min-h-[100dvh] flex-col items-center justify-center bg-ink px-8 text-center text-white">
      <div className="display text-[20px] tracking-[2px] text-accent">TOURNAMENTPAL</div>
      <h1 className="display mt-6 text-[34px] leading-tight">You&apos;re offline</h1>
      <p className="mt-3 max-w-[300px] text-[14px] text-white/60">
        No connection right now. Your last-loaded schedule and standings are still
        on screen — reconnect to get live scores.
      </p>
      <Link href="/" className="btn-accent mt-8 flex h-13 items-center justify-center rounded-2xl px-6" style={{ height: 52 }}>
        Try again
      </Link>
    </div>
  );
}
