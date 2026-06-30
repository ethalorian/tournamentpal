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
  const ctaHref = user ? "/director" : "/signup";
  const signInHref = user ? "/director" : "/login";

  return (
    <main className="min-h-[100dvh] bg-board">
      {/* ============ MOBILE HERO (unchanged phone-first design) ============ */}
      <div className="app-shell flex min-h-[100dvh] flex-col bg-ink text-white md:hidden">
        <header className="flex items-center justify-between px-6 pt-7">
          <span className="display text-[18px] tracking-[2px]">TOURNAMENTPAL</span>
          <Link href={signInHref} className="rounded-lg border border-white/30 px-4 py-2 text-[13px] font-semibold">
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </header>

        <div className="flex flex-1 flex-col px-6 pt-10">
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
            Pools, brackets and scheduling from presets. Post a score and every follower gets a text. One
            link, no spreadsheets.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href={ctaHref} className="btn-accent flex h-14 items-center justify-center rounded-2xl text-[16px]">
              {user ? "Go to your dashboard" : "Get started free"}
            </Link>
            <Link href="/login" className="flex h-14 items-center justify-center rounded-2xl border border-white/25 text-[15px] font-bold">
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
        </div>
      </div>

      {/* ============ DESKTOP HERO — design 18a ============ */}
      <div className="hidden min-h-[100dvh] flex-col items-center justify-center px-8 py-12 md:flex">
        <DesktopHero18a ctaHref={ctaHref} signInHref={signInHref} loggedIn={Boolean(user)} />
        <div className="mt-10 grid w-full max-w-[980px] grid-cols-2 gap-3 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.k} className="rounded-2xl border border-ink/10 bg-white p-5">
              <div className="display text-[14px]">{f.k}</div>
              <div className="mt-2 text-[13px] text-muted">{f.v}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function DesktopHero18a({
  ctaHref,
  signInHref,
  loggedIn,
}: {
  ctaHref: string;
  signInHref: string;
  loggedIn: boolean;
}) {
  return (
    <div
      className="relative w-full max-w-[980px] overflow-hidden rounded-[22px] bg-ink text-white"
      style={{ fontFamily: "'Archivo',system-ui", boxShadow: "0 34px 70px rgba(20,24,40,.3)" }}
    >
      {/* decorative diamond grid */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-[420px] w-[420px] opacity-[0.07]">
        <div className="absolute inset-10 rotate-45 rounded-[18px] border-[3px] border-white" />
        <div className="absolute inset-[90px] rotate-45 rounded-[14px] border-[3px] border-white" />
      </div>

      {/* nav */}
      <div className="relative flex items-center justify-between px-10 py-6">
        <div className="display text-[20px] tracking-[1.5px]">TOURNAMENTPAL</div>
        <div className="flex items-center gap-7 text-[13px] font-semibold text-white/70">
          <span className="hidden lg:inline">Features</span>
          <span className="hidden lg:inline">Pricing</span>
          <span className="hidden lg:inline">For followers</span>
          <Link href={signInHref} className="rounded-[9px] border border-white/30 px-4 py-2 text-white">
            {loggedIn ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </div>

      {/* body */}
      <div className="relative flex gap-10 px-10 pb-12 pt-6">
        <div className="flex-1" style={{ maxWidth: 520 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5">
            <span className="h-[7px] w-[7px] rounded-full bg-accent" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent">
              Now in beta · Baseball &amp; Softball
            </span>
          </div>
          <h1 className="display mt-6 text-[clamp(40px,5vw,56px)] leading-[1.06]">
            RUN THE
            <br />
            TOURNAMENT,
            <br />
            NOT THE CHAOS.
          </h1>
          <p className="mt-5 max-w-[440px] text-[16px] leading-relaxed text-white/70">
            Pools, brackets and scheduling from presets. Post a score and every follower gets a text. One
            link, no spreadsheets.
          </p>

          <div className="mt-8 text-[11px] font-extrabold uppercase tracking-wider text-white/50">
            Have a promo code?
          </div>
          <form action={ctaHref} className="mt-2.5 flex max-w-[440px] gap-2.5">
            <input
              name="code"
              defaultValue="SLAM-2026"
              className="h-[54px] flex-1 rounded-xl border-2 border-white/20 bg-white/[0.04] px-[18px] font-mono text-[15px] tracking-[2px] text-white outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="btn-accent flex h-[54px] items-center whitespace-nowrap rounded-xl px-6 text-[16px]"
            >
              GET TEST ACCESS
            </button>
          </form>
          <div className="mt-3 text-[12px] font-semibold text-white/45">
            Codes unlock a full director account free during beta. No card required.
          </div>
        </div>

        {/* right: phone peek */}
        <div className="relative hidden w-[250px] shrink-0 lg:block">
          {/* floating bracket card */}
          <div
            className="absolute -left-8 top-[92px] w-[144px] -rotate-[7deg] rounded-xl bg-white p-3 text-ink"
            style={{ boxShadow: "0 18px 40px rgba(0,0,0,.4)" }}
          >
            <div className="display text-[8px] tracking-[1px]">GOLD BRACKET</div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="rounded-[5px] border-[1.5px] border-ink px-1.5 py-1 text-[8px] font-extrabold">Lightning</div>
                <div className="rounded-[5px] border-[1.5px] border-[#d5d5d5] px-1.5 py-1 text-[8px] font-bold text-[#999]">Heat</div>
              </div>
              <div className="h-0.5 w-2 bg-[#cbcbcb]" />
              <div className="flex-1 rounded-[5px] border-2 border-accent bg-[#fffdf2] px-1.5 py-[7px] text-[8px] font-extrabold">Final</div>
            </div>
          </div>

          {/* followers texted card */}
          <div
            className="absolute bottom-[42px] -left-5 z-[3] flex w-[182px] rotate-[4deg] items-center gap-3 rounded-xl bg-accent p-3 px-3.5 text-ink"
            style={{ boxShadow: "0 18px 40px rgba(0,0,0,.35)" }}
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M10 3 C6.7 3 5.3 5 5.3 8 V12 L3.7 14 H16.3 L14.7 12 V8 C14.7 5 13.3 3 10 3 Z" stroke="#0a0a0a" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M8 16 a2 2 0 0 0 4 0" stroke="#0a0a0a" strokeWidth="1.8" />
            </svg>
            <div>
              <div className="display text-[22px] leading-none">92</div>
              <div className="mt-0.5 text-[9px] font-extrabold tracking-wide">FOLLOWERS TEXTED</div>
            </div>
          </div>

          {/* phone */}
          <div
            className="absolute left-1/2 top-2 w-[236px] -translate-x-1/2 rounded-[38px] p-[7px]"
            style={{ background: "linear-gradient(160deg,#2c2c30,#070708)", boxShadow: "0 24px 50px rgba(0,0,0,.4)" }}
          >
            <div className="relative h-[392px] w-[222px] overflow-hidden rounded-[31px] bg-ink">
              <div className="flex items-center justify-between bg-ink px-4 pb-2.5 pt-3.5">
                <div className="display text-[11px] tracking-[1px] text-white">TOURNAMENTPAL</div>
                <div className="display text-[9px] tracking-[1px] text-accent">LIVE</div>
              </div>
              <div className="h-full bg-white px-3 py-3">
                <div className="display inline-block rounded-[4px] bg-ink px-1.5 py-[3px] text-[8px] tracking-[1px] text-accent">
                  14U GOLD
                </div>
                <div className="mt-2 flex items-end justify-between border-b-[2.5px] border-ink pb-1.5 pt-2">
                  <div className="display text-[18px] text-ink">LIGHTNING</div>
                  <div className="display text-[30px] text-blue">4</div>
                </div>
                <div className="flex items-end justify-between py-1.5">
                  <div className="display text-[18px] text-[#b8bcc4]">RIPTIDE</div>
                  <div className="display text-[30px] text-[#b8bcc4]">3</div>
                </div>
                <div className="mt-1 rounded-[7px] bg-accent px-2.5 py-[7px] display text-[12px] text-ink">
                  FINAL · FIELD 2
                </div>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <div className="h-[30px] rounded-lg border-[1.5px] border-faint" />
                  <div className="h-[30px] rounded-lg border-[1.5px] border-faint" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
