import Link from "next/link";
import { loadManagedTeam } from "@/lib/manager";
import { ManagerShell } from "@/components/ManagerShell";
import { BackLink } from "@/components/DirectorShell";
import { Eyebrow, Badge, EmptyState } from "@/components/ui";
import { gameDayTime } from "@/lib/format";
import { buildStandingsTables } from "@/lib/standings-data";
import type { Rules } from "@/lib/engine/types";

export const dynamic = "force-dynamic";

export default async function ManagerHome({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { supabase, team, tournament, unread } = await loadManagedTeam(teamId);

  const [{ data: allTeams }, { data: games }, poolTeam] = await Promise.all([
    supabase.from("teams").select("id,name").eq("tournament_id", tournament.id),
    supabase
      .from("games")
      .select("*")
      .eq("tournament_id", tournament.id)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order("scheduled_at"),
    supabase.from("pool_teams").select("pool_id").eq("team_id", teamId).maybeSingle(),
  ]);

  const teamName = new Map((allTeams ?? []).map((t) => [t.id, t.name]));
  const nm = (id: string | null) => (id ? teamName.get(id) ?? "TBD" : "TBD");
  const gameList = games ?? [];
  const nextGame = gameList.find((g) => g.status === "scheduled" && g.home_team_id && g.away_team_id);

  const rules = (tournament.rules ?? undefined) as Rules | undefined;
  const tables = await buildStandingsTables(supabase, tournament.id, rules);
  const myTable = poolTeam.data?.pool_id
    ? tables.find((t) => t.poolId === poolTeam.data!.pool_id)
    : tables[0];

  return (
    <ManagerShell teamId={teamId} unread={unread}>
      <BackLink href="/manager" label="Teams" />
      <div className="mt-3 flex items-center justify-between">
        <div>
          <Eyebrow>{tournament.name}</Eyebrow>
          <h1 className="display mt-1.5 text-[26px]">{team.name}</h1>
        </div>
        <Badge tone={tournament.status === "live" ? "accent" : "muted"}>{tournament.status}</Badge>
      </div>

      {/* Message director */}
      <Link
        href={`/manager/${teamId}/messages`}
        className="btn-ink mt-5 flex h-[52px] items-center justify-center gap-2 rounded-2xl text-[15px]"
      >
        Message the director
        {unread > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-ink">
            {unread}
          </span>
        )}
      </Link>

      {/* Next game */}
      <Eyebrow className="mb-3 mt-7">Next up</Eyebrow>
      {nextGame ? (
        <div className="rounded-2xl border-2 border-ink p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
              {nextGame.bracket_slot ?? "Pool play"}
            </span>
            <span className="text-[11px] font-semibold text-muted">{gameDayTime(nextGame.scheduled_at)}</span>
          </div>
          <div className="display mt-3 text-[22px]">{nm(nextGame.home_team_id)}</div>
          <div className="my-0.5 text-[12px] font-bold text-muted">vs</div>
          <div className="display text-[22px]">{nm(nextGame.away_team_id)}</div>
        </div>
      ) : (
        <EmptyState title="No upcoming games" body="Check back once the bracket advances." />
      )}

      {/* Schedule */}
      <Eyebrow className="mb-3 mt-7">Your schedule</Eyebrow>
      {gameList.length === 0 ? (
        <EmptyState title="No games yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {gameList.map((g) => {
            const final = g.status === "final";
            const oppId = g.home_team_id === teamId ? g.away_team_id : g.home_team_id;
            const mine = g.home_team_id === teamId ? g.home_score : g.away_score;
            const opp = g.home_team_id === teamId ? g.away_score : g.home_score;
            const won = final && (mine ?? 0) > (opp ?? 0);
            const lost = final && (mine ?? 0) < (opp ?? 0);
            return (
              <div key={g.id} className="flex items-center justify-between rounded-xl border border-faint px-3.5 py-2.5">
                <div>
                  <div className="text-[14px] font-bold">vs {nm(oppId)}</div>
                  <div className="text-[11px] font-semibold text-muted">{gameDayTime(g.scheduled_at)}</div>
                </div>
                {final ? (
                  <div className="flex items-center gap-2">
                    <span className="display text-[16px]">{mine}–{opp}</span>
                    <Badge tone={won ? "success" : lost ? "danger" : "muted"}>{won ? "W" : lost ? "L" : "T"}</Badge>
                  </div>
                ) : (
                  <Badge tone="muted">Upcoming</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pool standings */}
      {myTable && myTable.rows.length > 0 && (
        <>
          <Eyebrow className="mb-2 mt-7">{myTable.name}</Eyebrow>
          <div className="overflow-hidden rounded-2xl border border-faint">
            {myTable.rows.map((r, i) => (
              <div
                key={r.teamId}
                className={`flex items-center px-3 py-2.5 text-[13px] ${
                  r.teamId === teamId ? "bg-accent" : i % 2 ? "bg-haze" : "bg-white"
                }`}
              >
                <span className="display w-6 text-[14px]">{r.rank}</span>
                <span className="flex-1 font-bold">{r.name}</span>
                <span className="w-14 text-center font-bold">{r.wins}-{r.losses}</span>
                <span className="w-12 text-right font-bold">{r.runDiff > 0 ? "+" : ""}{r.runDiff}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <Link href={`/t/${tournament.id}`} className="mt-7 block text-center text-[13px] font-bold text-muted">
        View public tournament page
      </Link>
    </ManagerShell>
  );
}
