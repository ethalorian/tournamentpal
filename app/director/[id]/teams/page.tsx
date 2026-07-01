import Link from "next/link";
import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Stepper } from "@/components/Stepper";
import { Field, inputClass, Button, EmptyState, Eyebrow, Badge } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { addTeams, removeTeam, toggleRegistration } from "@/app/director/actions";

export const dynamic = "force-dynamic";

export default async function TeamsStep({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setup?: string }>;
}) {
  const { id } = await params;
  const { setup } = await searchParams;
  const isWizard = setup === "1";
  const { tournament, supabase } = await loadOwnedTournament(id);

  const [{ data: teams }, { data: divisions }] = await Promise.all([
    supabase.from("teams").select("*").eq("tournament_id", id).order("seed"),
    supabase.from("divisions").select("*").eq("tournament_id", id).order("sort"),
  ]);
  const divList = divisions ?? [];
  const teamList = teams ?? [];

  const body = (
    <>
      <form action={addTeams} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="tournament_id" value={id} />
        {divList.length > 0 && (
          <Field label="Division for this batch">
            <select name="division_id" className={inputClass}>
              {divList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Team names" hint="One per line, or paste a CSV (first column is the team name).">
          <textarea
            name="teams"
            rows={4}
            className={inputClass}
            placeholder={"Tigard Heat\nCascade Crush\nRiver City Rays"}
          />
        </Field>
        <Button type="submit" variant="ink" className="w-full">
          Add teams
        </Button>
      </form>

      {/* Reuse from a past event */}
      <Link
        href={`/director/${id}/directory${isWizard ? "?setup=1" : ""}`}
        className="mt-3 flex items-center justify-between rounded-xl border border-faint px-4 py-3"
      >
        <div>
          <div className="text-[13px] font-bold">Reuse a team from a past event</div>
          <div className="text-[11px] text-muted">Coach &amp; contact come with it.</div>
        </div>
        <span className="text-[13px] font-bold text-ink">→</span>
      </Link>

      {/* Self-serve registration link */}
      <div className="mt-3 rounded-xl border border-faint p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold">Registration link</div>
            <div className="text-[11px] text-muted">
              Let coaches add their own team.{" "}
              <Badge tone={tournament.registration_open ? "success" : "muted"}>
                {tournament.registration_open ? "Open" : "Closed"}
              </Badge>
            </div>
          </div>
          <form action={toggleRegistration}>
            <input type="hidden" name="tournament_id" value={id} />
            <input type="hidden" name="open" value={tournament.registration_open ? "0" : "1"} />
            <button type="submit" className="display rounded-full border-2 border-ink px-3 py-1.5 text-[11px] tracking-wide">
              {tournament.registration_open ? "Close" : "Open"}
            </button>
          </form>
        </div>
        {tournament.registration_open && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="truncate rounded-lg bg-haze px-3 py-2 font-mono text-[11px]">/register/{id}</span>
            <CopyButton path={`/register/${id}`} label="Copy link" />
          </div>
        )}
      </div>

      <Eyebrow className="mt-7 mb-3">
        {teamList.length} {teamList.length === 1 ? "team" : "teams"}
      </Eyebrow>

      {teamList.length === 0 ? (
        <EmptyState title="No teams yet" body="Add at least 3 to build a schedule." />
      ) : (
        <div className="flex flex-col gap-2">
          {teamList.map((t) => (
            <div key={t.id} className="rounded-xl border border-faint px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="display flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-haze text-[12px]">
                    {t.seed}
                  </span>
                  <span className="truncate text-[14px] font-bold">{t.name}</span>
                  {t.manager_id ? <Badge tone="success">Coach</Badge> : <Badge tone="muted">Unclaimed</Badge>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!t.manager_id && <CopyButton path={`/claim/${t.id}`} />}
                  <form action={removeTeam}>
                    <input type="hidden" name="team_id" value={t.id} />
                    <input type="hidden" name="tournament_id" value={id} />
                    <button type="submit" className="text-[12px] font-bold text-muted hover:text-danger">
                      Remove
                    </button>
                  </form>
                </div>
              </div>
              {!t.manager_id && (
                <div className="mt-1.5 pl-10 font-mono text-[10px] text-muted">/claim/{t.id.slice(0, 8)}…</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (isWizard) {
    return (
      <DirectorShell showTabs={false}>
        <BackLink href="/director/new" label="Details" />
        <div className="mt-4">
          <Stepper step={2} total={5} label="Add teams" />
        </div>
        <h1 className="display mt-5 text-[26px]">{tournament.name}</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Add teams, reuse past ones, or open registration for coaches.
        </p>
        {body}
        <Link
          href={`/director/${id}/fields?setup=1`}
          className="btn-accent mt-7 flex h-[54px] items-center justify-center rounded-2xl text-[16px]"
          aria-disabled={teamList.length < 3}
          style={teamList.length < 3 ? { opacity: 0.5, pointerEvents: "none" } : undefined}
        >
          Continue to fields →
        </Link>
      </DirectorShell>
    );
  }

  return (
    <DirectorShell>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Teams &amp; claim links</h1>
      <TournamentNav id={id} />
      <p className="mt-4 text-[12px] text-muted">
        Copy an unclaimed team&apos;s link and send it to its coach — they claim it to manage the team and get your texts.
      </p>
      {body}
    </DirectorShell>
  );
}
