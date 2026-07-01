import Link from "next/link";
import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Stepper } from "@/components/Stepper";
import { Field, inputClass, Button, EmptyState, Eyebrow, Badge } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { RemoveTeamButton } from "@/components/RemoveTeamButton";
import { ScanTeamsButton } from "@/components/ScanTeamsButton";
import { addTeams, toggleRegistration } from "@/app/director/actions";

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

  // Give each division a distinct color so the level of every team card is
  // scannable at a glance.
  const DIVISION_COLORS = [
    "#E4572E", "#2E86AB", "#2A9D8F", "#7B4B94",
    "#E8A100", "#0B7A75", "#C1292E", "#3D5A80",
  ];
  const NO_DIV = "#B4B9C0";
  const divMeta = new Map<string, { name: string; color: string }>();
  divList.forEach((d, i) =>
    divMeta.set(d.id, { name: d.name, color: DIVISION_COLORS[i % DIVISION_COLORS.length] })
  );
  const levelOf = (divId: string | null) =>
    (divId && divMeta.get(divId)) || { name: "No division", color: NO_DIV };

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
            id="teams-input"
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

      {/* Prefill the textarea above from a screenshot (Claude vision). */}
      <ScanTeamsButton targetId="teams-input" />

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

      {/* Color legend for divisions/levels */}
      {divList.length > 0 && teamList.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {divList.map((d) => (
            <span key={d.id} className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: divMeta.get(d.id)?.color }}
              />
              {d.name}
            </span>
          ))}
        </div>
      )}

      {teamList.length === 0 ? (
        <EmptyState title="No teams yet" body="Add at least 3 to build a schedule." />
      ) : (
        <div className="flex flex-col gap-2">
          {teamList.map((t) => {
            const lvl = levelOf(t.division_id);
            return (
            <div
              key={t.id}
              className="rounded-xl border border-faint border-l-[5px] px-3.5 py-2.5"
              style={{ borderLeftColor: lvl.color }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="display flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-haze text-[12px]">
                    {t.seed}
                  </span>
                  <span className="truncate text-[14px] font-bold">{t.name}</span>
                  {divList.length > 0 && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white"
                      style={{ backgroundColor: lvl.color }}
                    >
                      {lvl.name}
                    </span>
                  )}
                  {t.manager_id ? <Badge tone="success">Coach</Badge> : <Badge tone="muted">Unclaimed</Badge>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!t.manager_id && <CopyButton path={`/claim/${t.id}`} />}
                  <RemoveTeamButton
                    teamId={t.id}
                    tournamentId={id}
                    teamName={t.name}
                    warn={tournament.status !== "draft"}
                  />
                </div>
              </div>
              {!t.manager_id && (
                <div className="mt-1.5 pl-10 font-mono text-[10px] text-muted">/claim/{t.id.slice(0, 8)}…</div>
              )}
            </div>
            );
          })}
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
