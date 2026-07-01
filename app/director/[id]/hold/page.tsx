import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { Eyebrow, Field, inputClass, Button, Badge } from "@/components/ui";
import { setHold, clearHold } from "@/app/director/hold";

export const dynamic = "force-dynamic";

const OPTIONS = [
  { value: "hold", label: "Hold", blurb: "Pause play — lightning, field prep." },
  { value: "delay", label: "Delay", blurb: "Games pushed back; set a resume time." },
  { value: "postponed", label: "Postpone", blurb: "Moved to later / another day." },
  { value: "cancelled", label: "Cancel", blurb: "Games called off." },
];

export default async function HoldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament } = await loadOwnedTournament(id);
  const held = tournament.hold_status;

  return (
    <DirectorShell showTabs={false}>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Weather &amp; play</h1>
      <p className="mt-1.5 text-[13px] text-muted">
        One push to every follower the moment you change status.
      </p>

      {held ? (
        <div className="mt-6 rounded-2xl border-2 border-danger p-4">
          <div className="flex items-center justify-between">
            <span className="display text-[16px]">Currently: {held}</span>
            <Badge tone="danger">Live</Badge>
          </div>
          {tournament.hold_note && <p className="mt-2 text-[13px] text-ink">{tournament.hold_note}</p>}
          {tournament.hold_until && (
            <p className="mt-1 text-[12px] text-muted">
              Resume ~
              {new Date(tournament.hold_until).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          )}
          <form action={clearHold} className="mt-4">
            <input type="hidden" name="tournament_id" value={id} />
            <Button type="submit" className="w-full">
              Resume play — notify everyone
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-faint bg-haze p-4 text-[13px] font-semibold text-muted">
          Play is running normally.
        </div>
      )}

      <Eyebrow className="mb-3 mt-7">{held ? "Change status" : "Set a hold"}</Eyebrow>
      <form action={setHold} className="flex flex-col gap-4">
        <input type="hidden" name="tournament_id" value={id} />
        <div className="flex flex-col gap-2">
          {OPTIONS.map((o, i) => (
            <label key={o.value} className="cursor-pointer">
              <input type="radio" name="status" value={o.value} defaultChecked={i === 0} className="peer sr-only" />
              <div className="rounded-xl border-2 border-faint px-4 py-3 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
                <div className="font-extrabold text-[14px]">{o.label}</div>
                <div className="text-[12px] opacity-70">{o.blurb}</div>
              </div>
            </label>
          ))}
        </div>
        <Field label="Message to followers" hint="Optional — shown in the alert and banner.">
          <textarea name="note" rows={2} className={`${inputClass} resize-none`} placeholder="Lightning in the area. Clearing fields, back in ~30." />
        </Field>
        <Field label="Estimated resume time" hint="Optional.">
          <input name="until" type="datetime-local" className={inputClass} />
        </Field>
        <Button type="submit" variant="ink" className="w-full">
          Send status update
        </Button>
      </form>
    </DirectorShell>
  );
}
