import { notFound } from "next/navigation";
import { loadPublicTournament } from "@/lib/public";
import { FollowerShell } from "@/components/FollowerShell";
import { FollowButton } from "@/components/FollowButton";
import { Eyebrow, Badge, EmptyState, Stat } from "@/components/ui";
import { dayLabel, gameDayTime } from "@/lib/format";
import { buildStandingsTables } from "@/lib/standings-data";
import { projectSeeding } from "@/lib/engine/seeding";
import { getPreset } from "@/lib/engine/presets";
import { DEFAULT_RULES } from "@/lib/engine/standings";
import type { Rules } from "@/lib/engine/types";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const { id, teamId } = await params;
  const { tournament, supabase, user } = await loadPublicTournament(id);
  const tid = tournament.id; // real UUID; `id` (route) may be a slug

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .eq("tournament_id", tid)
    .single();
  if (!team) notFound();

  const [{ data: allTeams }, { data: games }, poolTeam, follow] = await Promise.all([
    supabase.from("teams").select("id,name").eq("tournament_id", tid),
    supabase
      .from("games")
      .select("*")
      .eq("tournament_id", tid)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order("scheduled_at"),
    supabase.from("pool_teams").select("pool_id").eq("team_id", teamId).maybeSingle(),
    user
      ? supabase.from("follows").select("team_id").eq("follower_id", user.id).eq("team_id", teamId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const teamName = new Map((allTeams ?? []).map((t) => [t.id, t.name]));
  const nm = (tid: string | null) => (tid ? teamName.get(tid) ?? "TBD" : "TBD");
  const isFollowing = Boolean(follow.data);

  const rules = (tournament.rules ?? undefined) as Rules | undefined;
  const tables = await buildStandingsTables(supabase, tid, rules);
  const poolId = poolTeam.data?.pool_id ?? null;
  const myTable = poolId ? tables.find((t) => t.poolId === poolId) : tables[0];

  // Seeding outlook — current standing + best/worst finish given remaining games.
  const poolGamesQuery = poolId
    ? supabase.from("games").select("home_team_id,away_team_id,home_score,away_score,status").eq("pool_id", poolId)
    : supabase
        .from("games")
        .select("home_team_id,away_team_id,home_score,away_score,status")
        .eq("tournament_id", tid)
        .eq("stage", "pool");
  const { data: poolGames } = await poolGamesQuery;
  const poolResults = (poolGames ?? []).map((g) => ({
    homeTeamId: g.home_team_id,
    awayTeamId: g.away_team_id,
    homeScore: g.home_score,
    awayScore: g.away_score,
    status: g.status,
  }));
  const format = (tournament.format ?? {}) as { presetId?: string; bracketTeams?: number };
  const preset = format.presetId ? getPreset(format.presetId) : undefined;
  const bracketTeams = format.bracketTeams ?? preset?.bracketTeams ?? 0;
  const members = (myTable?.rows ?? []).map((r) => ({ id: r.teamId, name: r.name }));
  const outlook =
    members.length >= 2
      ? projectSeeding(members, poolResults, teamId, rules ?? DEFAULT_RULES, bracketTeams)
      : null;

  return (
    <FollowerShell
      id={id}
      tournamentName={tournament.name}
      dayLabel={dayLabel(tournament)}
      hold={{ status: tournament.hold_status, note: tournament.hold_note, until: tournament.hold_until }}
      backHref={`/t/${id}`}
      backLabel="Tournament home"
    >
      <div className="-mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="display flex h-12 w-12 items-center justify-center rounded-full bg-ink text-[18px] text-white">
            {team.name.slice(0, 1)}
          </span>
          <div>
            <div className="display text-[22px] leading-tight">{team.name}</div>
            {team.seed && <div className="text-[11px] font-semibold text-muted">Seed #{team.seed}</div>}
          </div>
        </div>
        <FollowButton tournamentId={tid} teamId={teamId} isFollowing={isFollowing} returnTo={`/t/${id}/team/${teamId}`} />
      </div>

      <Eyebrow className="mb-3 mt-7">Games</Eyebrow>
      {(games ?? []).length === 0 ? (
        <EmptyState title="No games scheduled" />
      ) : (
        <div className="flex flex-col gap-2">
          {(games ?? []).map((g) => {
            const isFinal = g.status === "final";
            const oppId = g.home_team_id === teamId ? g.away_team_id : g.home_team_id;
            const myScore = g.home_team_id === teamId ? g.home_score : g.away_score;
            const oppScore = g.home_team_id === teamId ? g.away_score : g.home_score;
            const won = isFinal && (myScore ?? 0) > (oppScore ?? 0);
            const lost = isFinal && (myScore ?? 0) < (oppScore ?? 0);
            return (
              <div key={g.id} className="flex items-center justify-between rounded-xl border border-faint px-3.5 py-2.5">
                <div>
                  <div className="text-[14px] font-bold">vs {nm(oppId)}</div>
                  <div className="text-[11px] font-semibold text-muted">
                    {g.bracket_slot ?? "Pool"} · {gameDayTime(g.scheduled_at, tournament.timezone)}
                  </div>
                </div>
                {isFinal ? (
                  <div className="flex items-center gap-2">
                    <span className="display text-[16px]">
                      {myScore}–{oppScore}
                    </span>
                    <Badge tone={won ? "success" : lost ? "danger" : "muted"}>
                      {won ? "W" : lost ? "L" : "T"}
                    </Badge>
                  </div>
                ) : (
                  <Badge tone="muted">Upcoming</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

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
                <span className="w-14 text-center font-bold">
                  {r.wins}-{r.losses}
                </span>
                <span className="w-12 text-right font-bold">
                  {r.runDiff > 0 ? "+" : ""}
                  {r.runDiff}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {outlook && (
        <>
          <Eyebrow className="mb-2 mt-7">Seeding outlook</Eyebrow>
          <div className="rounded-2xl border-2 border-ink p-4">
            <div className="flex gap-6">
              <Stat value={`#${outlook.currentRank}`} label={`of ${outlook.totalTeams}`} />
              <Stat value={outlook.remaining} label="games left" />
              {outlook.bracketTeams > 0 && (
                <Stat
                  value={outlook.currentlyIn ? "IN" : "OUT"}
                  label="bracket"
                  accent={outlook.currentlyIn ? undefined : "danger"}
                />
              )}
            </div>

            {outlook.remaining > 0 ? (
              <p className="mt-3 text-[13px] leading-snug">
                Win out and you finish as high as <b className="text-ink">#{outlook.bestRank}</b>; lose out and
                you could fall to <b className="text-ink">#{outlook.worstRank}</b>.
              </p>
            ) : (
              <p className="mt-3 text-[13px] text-muted">Pool play is complete — this is your final seeding.</p>
            )}

            {outlook.bracketTeams > 0 && (
              <div className="mt-3">
                {outlook.clinched ? (
                  <Badge tone="success">Clinched a bracket spot</Badge>
                ) : outlook.eliminated ? (
                  <Badge tone="danger">Eliminated from the bracket</Badge>
                ) : outlook.currentlyIn ? (
                  <Badge tone="accent">In the top {outlook.bracketTeams} — not yet clinched</Badge>
                ) : (
                  <Badge tone="muted">Outside the top {outlook.bracketTeams} — still in reach</Badge>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </FollowerShell>
  );
}
