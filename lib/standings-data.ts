import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { computeStandings, DEFAULT_RULES } from "@/lib/engine/standings";
import type { GameResult, Rules, StandingRow } from "@/lib/engine/types";

type SB = SupabaseClient<Database>;

export type StandingsTable = { name: string; poolId: string | null; rows: StandingRow[] };

/**
 * Computes standings tables (one per pool, or one overall) for a tournament.
 * Shared by the director and public standings views.
 */
export async function buildStandingsTables(
  supabase: SB,
  tournamentId: string,
  rules?: Rules
): Promise<StandingsTable[]> {
  const r = rules ?? DEFAULT_RULES;

  const [{ data: teams }, { data: pools }, { data: poolTeams }, { data: games }] = await Promise.all([
    supabase.from("teams").select("id,name,seed").eq("tournament_id", tournamentId),
    supabase.from("pools").select("*").eq("tournament_id", tournamentId).order("name"),
    supabase.from("pool_teams").select("*").eq("tournament_id", tournamentId),
    supabase.from("games").select("*").eq("tournament_id", tournamentId).eq("stage", "pool"),
  ]);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const results: GameResult[] = (games ?? []).map((g) => ({
    homeTeamId: g.home_team_id,
    awayTeamId: g.away_team_id,
    homeScore: g.home_score,
    awayScore: g.away_score,
    status: g.status,
  }));

  if ((pools ?? []).length > 0) {
    return (pools ?? []).map((pool) => {
      const memberIds = (poolTeams ?? []).filter((pt) => pt.pool_id === pool.id).map((pt) => pt.team_id);
      const members = memberIds
        .map((tid) => teamMap.get(tid))
        .filter(Boolean)
        .map((t) => ({ id: t!.id, name: t!.name, seed: t!.seed }));
      return { name: pool.name, poolId: pool.id, rows: computeStandings(members, results, r) };
    });
  }

  return [
    {
      name: "Standings",
      poolId: null,
      rows: computeStandings(
        (teams ?? []).map((t) => ({ id: t.id, name: t.name, seed: t.seed })),
        results,
        r
      ),
    },
  ];
}
