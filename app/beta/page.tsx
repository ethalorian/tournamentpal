import { submitBetaCode } from "./actions";

export const dynamic = "force-dynamic";

export default async function BetaGate({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="app-shell flex min-h-[100dvh] flex-col justify-center px-6 py-10">
      <div className="display text-[16px] tracking-[2px]">TOURNAMENT<span className="text-blue">PAL</span></div>
      <div className="eyebrow mt-6">Private beta</div>
      <h1 className="display mt-2 text-[30px] leading-tight">Enter your access code</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        The director tools are invite-only right now. Pop in your beta code to unlock them —
        you&rsquo;ll only need to do this once on this device.
      </p>

      <form action={submitBetaCode} className="mt-7 flex flex-col gap-3">
        <input type="hidden" name="next" value={next ?? "/director"} />
        <input
          name="code"
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Access code"
          aria-label="Beta access code"
          className="w-full min-w-0 rounded-2xl border-2 border-faint bg-haze px-5 py-4 text-center text-[18px] font-bold tracking-widest text-ink outline-none focus:border-ink placeholder:font-normal placeholder:tracking-normal placeholder:text-muted"
        />
        {error && (
          <p className="text-center text-[13px] font-bold text-danger">
            That code isn&rsquo;t right — check it and try again.
          </p>
        )}
        <button
          type="submit"
          className="btn-ink flex h-14 w-full items-center justify-center rounded-2xl text-[16px]"
        >
          Unlock director tools
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-faint p-3 text-[12px] leading-relaxed text-muted">
        Just here to follow a team? You don&rsquo;t need a code — open the tournament link your
        director shared with you.
      </div>
    </div>
  );
}
