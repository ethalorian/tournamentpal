import Link from "next/link";
import { getUser } from "@/lib/auth";

const FEATURES: { k: string; v: string }[] = [
  { k: "Presets", v: "Pools & brackets auto-fit to your team count." },
  { k: "Auto-schedule", v: "Every game placed across fields, conflicts flagged." },
  { k: "One tap to post", v: "Mark a final and every follower gets a text." },
  { k: "Live standings", v: "Ties broken by your rules, instantly." },
];

export default async function Home() {
  const user = await getUser();

  return (
    <div className="app-shell flex min-h-[100dvh] flex-col bg-ink text-white">
      <header className="flex items-center justify-between px-6 pt-7">
        <span className="display text-[18px] tracking-[2px]">TOURNAMENTPAL</span>
        <Link
          href={user ? "/director" : "/login"}
          className="rounded-lg border border-white/30 px-4 py-2 text-[13px] font-semibold"
        >
          {user ? "Dashboard" : "Sign in"}
        </Link>
      </header>

      <main className="flex flex-1 flex-col px-6 pt-10">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent">
            Now in beta · Baseball &amp; Softball
          </span>
        </span>

        <h1 className="display mt-6 text-[52px] leading-[1.02]">
          Run the
          <br />
          tournament,
          <br />
          not the chaos.
        </h1>

        <p className="mt-5 max-w-[420px] text-[16px] leading-relaxed text-white/70">
          Pools, brackets and scheduling from presets. Post a score and every
          follower gets a text. One link, no spreadsheets.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={user ? "/director" : "/signup"}
            className="btn-accent flex h-14 items-center justify-center rounded-2xl text-[16px]"
          >
            {user ? "Go to your dashboard" : "Get started free"}
          </Link>
          <Link
            href="/login"
            className="flex h-14 items-center justify-center rounded-2xl border border-white/25 text-[15px] font-bold"
          >
            I already direct events
          </Link>
        </div>

        <ul className="mt-12 mb-10 flex flex-col gap-px overflow-hidden rounded-2xl border border-white/10">
          {FEATURES.map((f) => (
            <li key={f.k} className="flex items-baseline gap-3 bg-white/[0.03] px-4 py-4">
              <span className="display min-w-[120px] text-[13px] text-accent">{f.k}</span>
              <span className="text-[13px] text-white/70">{f.v}</span>
            </li>
          ))}
        </ul>
      </main>

      <footer className="px-6 pb-8 text-[11px] text-white/40">
        © {new Date().getFullYear()} TournamentPal · Followers join free from a
        director&apos;s link.
      </footer>
    </div>
  );
}
