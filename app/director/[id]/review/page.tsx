import Link from "next/link";
import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { Stepper } from "@/components/Stepper";
import { Button, Eyebrow, Stat, Card } from "@/components/ui";
import { getPreset } from "@/lib/engine/presets";
import {
  generateScheduleAction,
  publishTournament,
} from "@/app/director/actions";

export const dynamic = "force-dynamic";

export default async function ReviewStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament, supabase } = await loadOwnedTournament(id);

  const format = (tournament.format ?? {}) as { presetId?: string };
  const preset = format.presetId ? getPreset(format.presetId) : undefined;

  const [{ data: games }, { data: pools }, { data: teams }] = await Promise.all([
    supabase.from("games").select("*").eq("tournament_id", id).order("scheduled_at"),
    supabase.from("pools").select("*").eq("tournament_id", id),
    supabase.from("teams").select("id,name").eq("tournament_id", id),
  ]);

  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const nm = (tid: string | null) => (tid ? teamName.get(tid) ?? "TBD" : "TBD");
  const teamCount = teams?.length ?? 0;
  const gameList = games ?? [];
  const poolGames = gameList.filter((g) => g.stage === "pool");
  const bracketGames = gameList.filter((g) => g.stage === "bracket");
  const conflicts = gameList.filter((g) => g.home_team_id && !g.field_id).length;
  const hasSchedule = gameList.length > 0;

  return (
    <DirectorShell showTabs={false}>
      <BackLink href={`/director/${id}/format`} label="Format" />
      <div className="mt-4">
        <Stepper step={5} total={5} label="Review & publish" />
      </div>

      <h1 className="display mt-5 text-[26px]">{tournament.name}</h1>
      <p className="mt-1.5 text-[13px] text-muted">
        {preset?.name ?? "No format chosen"} · {teamCount ?? 0} teams
      </p>

      {!hasSchedule ? (
        <Card className="mt-6">
          <div className="display text-[16px]">Generate the schedule</div>
          <p className="mt-1.5 text-[13px] text-muted">
            We&apos;ll build pools, round-robin pool games and a seeded bracket,
            then place every game across your fields.
          </p>
          <form action={generateScheduleAction} className="mt-4">
            <input type="hidden" name="tournament_id" value={id} />
            <Button type="submit" variant="ink" className="w-full">
              Generate schedule
            </Button>
          </form>
        </Card>
      ) : (
        <>
          <div className="mt-6 flex gap-6 rounded-2xl border-2 border-ink p-4">
            <Stat value={pools?.length ?? 0} label="Pools" />
            <Stat value={poolGames.length} label="Pool games" />
            <Stat value={bracketGames.length} label="Bracket" />
            <Stat value={conflicts} label="Conflicts" accent={conflicts ? "danger" : undefined} />
          </div>

          {conflicts > 0 && (
            <p className="mt-3 rounded-xl bg-danger/10 px-4 py-3 text-[12px] font-semibold text-danger">
              {conflicts} game(s) couldn&apos;t be placed — add fields or relax age
              restrictions in Fields, then regenerate.
            </p>
          )}

          <Eyebrow className="mt-6 mb-3">First games</Eyebrow>
          <div className="flex flex-col gap-2">
            {poolGames.slice(0, 5).map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-xl border border-faint px-3.5 py-2.5"
              >
                <div className="text-[13px] font-bold">
                  {nm(g.home_team_id)} <span className="text-muted">vs</span> {nm(g.away_team_id)}
                </div>
                <div className="text-[11px] font-semibold text-muted">
                  {g.scheduled_at
                    ? new Date(g.scheduled_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </div>
              </div>
            ))}
          </div>

          <form action={generateScheduleAction} className="mt-5">
            <input type="hidden" name="tournament_id" value={id} />
            <Button type="submit" variant="outline" className="w-full">
              Regenerate
            </Button>
          </form>

          <form action={publishTournament} className="mt-3">
            <input type="hidden" name="tournament_id" value={id} />
            <Button type="submit" className="w-full">
              Publish — make it public
            </Button>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted">
            Publishing opens the public follower page. You choose when to text
            followers afterward.
          </p>
        </>
      )}

      <div className="h-6" />
      <Link href={`/director/${id}`} className="block text-center text-[13px] font-bold text-muted">
        Skip to event dashboard
      </Link>
    </DirectorShell>
  );
}
