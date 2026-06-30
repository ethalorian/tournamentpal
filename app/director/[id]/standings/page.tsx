import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Eyebrow, Badge, Button, EmptyState } from "@/components/ui";
import { computeStandings, DEFAULT_RULES } from "@/lib/engine/standings";
import { getPreset } from "@/lib/engine/presets";
import type { GameResult, Rules } from "@/lib/engine/types";
import { seedBracket } from "@/app/director/actions";

export const dynamic = "force-dynamic";

export default async function StandingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament, supabase } = await loadOwnedTournament(id);
  const rules = (tournament.rules ?? DEFAULT_RULES) as Rules;

  const [{ data: teams }, { data: pools }, { data: poolTeams }, { data: games }] = await Promise.all([
    supabase.from("teams").select("id,name,seed").eq("tournament_id", id),
    supabase.from("pools").select("*").eq("tournament_id", id).order("name"),
    supabase.from("pool_teams").select("*").eq("tournament_id", id),
    supabase.from("games").select("*").eq("tournament_id", id),
  ]);

  const teamList = teams ?? [];
  const teamMap = new Map(teamList.map((t) => [t.id, t]));
  const allGames = games ?? [];
  const poolList = pools ?? [];

  const results: GameResult[] = allGames
    .filter((g) => g.stage === "pool")
    .map((g) => ({
      homeTeamId: g.home_team_id,
      awayTeamId: g.away_team_id,
      homeScore: g.home_score,
      awayScore: g.away_score,
      status: g.status,
    }));

  // Build a standings table per pool (or one table if no pools).
  const tables: { name: string; rows: ReturnType<typeof computeStandings> }[] = [];
  if (poolList.length > 0) {
    for (const pool of poolList) {
      const memberIds = (poolTeams ?? []).filter((pt) => pt.pool_id === pool.id).map((pt) => pt.team_id);
      const members = memberIds
        .map((tid) => teamMap.get(tid))
        .filter(Boolean)
        .map((t) => ({ id: t!.id, name: t!.name, seed: t!.seed }));
      tables.push({ name: pool.name, rows: computeStandings(members, results, rules) });
    }
  } else {
    tables.push({
      name: "Standings",
      rows: computeStandings(
        teamList.map((t) => ({ id: t.id, name: t.name, seed: t.seed })),
        results,
        rules
      ),
    });
  }

  const format = (tournament.format ?? {}) as { presetId?: string; bracketTeams?: number };
  const preset = format.presetId ? getPreset(format.presetId) : undefined;
  const bracketTeams = format.bracketTeams ?? preset?.bracketTeams ?? 0;

  const bracketR1 = allGames
    .filter((g) => g.stage === "bracket" && g.round === 1)
    .sort((a, b) => (a.bracket_slot ?? "").localeCompare(b.bracket_slot ?? ""));
  const poolFinals = allGames.filter((g) => g.stage === "pool" && g.status === "final").length;
  const poolTotal = allGames.filter((g) => g.stage === "pool").length;
  const poolComplete = poolTotal > 0 && poolFinals === poolTotal;

  return (
    <DirectorShell>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Standings</h1>
      <TournamentNav id={id} />

      <p className="mt-4 text-[12px] text-muted">
        Ties broken by:{" "}
        <span className="font-semibold text-ink">
          {rules.tiebreakers.map(prettyTiebreaker).join(" → ")}
        </span>
      </p>

      {tables.every((t) => t.rows.length === 0) ? (
        <EmptyState title="No standings yet" body="Add teams and publish to see the table." />
      ) : (
        tables.map((table) => (
          <div key={table.name} className="mt-6">
            <Eyebrow className="mb-2">{table.name}</Eyebrow>
            <div className="overflow-hidden rounded-2xl border border-faint">
              <div className="flex bg-ink px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white">
                <span className="w-6">#</span>
                <span className="flex-1">Team</span>
                <span className="w-12 text-center">W-L</span>
                <span className="w-12 text-right">Diff</span>
              </div>
              {table.rows.map((r, i) => (
                <div
                  key={r.teamId}
                  className={`flex items-center px-3 py-2.5 text-[13px] ${i % 2 ? "bg-haze" : "bg-white"}`}
                >
                  <span className="display w-6 text-[14px]">{r.rank}</span>
                  <span className="flex-1 font-bold">
                    {r.name}
                    {bracketTeams > 0 && r.rank <= bracketTeams && (
                      <Badge tone="accent" className="ml-2">
                        IN
                      </Badge>
                    )}
                  </span>
                  <span className="w-12 text-center font-bold">
                    {r.wins}-{r.losses}
                    {r.ties ? `-${r.ties}` : ""}
                  </span>
                  <span className={`w-12 text-right font-bold ${r.runDiff > 0 ? "text-success" : r.runDiff < 0 ? "text-danger" : ""}`}>
                    {r.runDiff > 0 ? "+" : ""}
                    {r.runDiff}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Bracket seeding */}
      {bracketTeams > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <Eyebrow>Bracket</Eyebrow>
            {!poolComplete && <Badge tone="muted">Pool play in progress</Badge>}
          </div>

          <form action={seedBracket} className="mt-3">
            <input type="hidden" name="tournament_id" value={id} />
            <Button type="submit" variant={poolComplete ? "ink" : "outline"} className="w-full">
              {poolComplete ? "Seed bracket from standings" : "Seed bracket now (pools unfinished)"}
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2">
            {bracketR1.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-xl border border-faint px-3.5 py-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
                  {g.bracket_slot}
                </span>
                <span className="text-[13px] font-bold">
                  {g.home_seed ? `#${g.home_seed} ` : ""}
                  {teamMap.get(g.home_team_id ?? "")?.name ?? "TBD"}
                  <span className="px-1.5 text-muted">vs</span>
                  {g.away_seed ? `#${g.away_seed} ` : ""}
                  {teamMap.get(g.away_team_id ?? "")?.name ?? "TBD"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DirectorShell>
  );
}

function prettyTiebreaker(k: string) {
  return (
    {
      headToHead: "Head-to-head",
      runDiff: "Run differential",
      runsAllowed: "Fewest runs allowed",
      runsScored: "Most runs scored",
      coinFlip: "Coin flip",
    }[k] ?? k
  );
}
