import { computeStandings } from "./standings";
import type { EngineTeam, GameResult, Rules } from "./types";

export type SeedingOutlook = {
  currentRank: number;
  bestRank: number; // if the team wins out (others held at current results)
  worstRank: number; // if the team loses out
  totalTeams: number;
  remaining: number; // team's own remaining games in this group
  bracketTeams: number; // 0 = no bracket cut
  currentlyIn: boolean; // currently inside the bracket cut
  clinched: boolean; // in even in the worst case
  eliminated: boolean; // out even in the best case
};

type SimGame = {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

/**
 * Projects a team's seeding within its pool/group: where it stands now, and the
 * best/worst it can finish based on its own remaining games (other teams held at
 * their current results — an honest, explainable range rather than a full
 * scenario tree). Also reports clinch/elimination against the bracket cut.
 */
export function projectSeeding(
  teams: EngineTeam[],
  games: SimGame[],
  teamId: string,
  rules: Rules,
  bracketTeams = 0
): SeedingOutlook {
  const finals: GameResult[] = games.filter((g) => g.status === "final") as GameResult[];
  const remaining = games.filter(
    (g) => g.status !== "final" && (g.homeTeamId === teamId || g.awayTeamId === teamId)
  );

  const rankWith = (extra: GameResult[]): number => {
    const s = computeStandings(teams, [...finals, ...extra], rules);
    return s.find((r) => r.teamId === teamId)?.rank ?? teams.length;
  };

  const hypothetical = (teamWins: boolean): GameResult[] =>
    remaining.map((g) => {
      const teamIsHome = g.homeTeamId === teamId;
      const teamScore = teamWins ? 7 : 0;
      const oppScore = teamWins ? 0 : 7;
      return {
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        homeScore: teamIsHome ? teamScore : oppScore,
        awayScore: teamIsHome ? oppScore : teamScore,
        status: "final",
      };
    });

  const currentRank = rankWith([]);
  const bestRank = Math.min(currentRank, rankWith(hypothetical(true)));
  const worstRank = Math.max(currentRank, rankWith(hypothetical(false)));

  return {
    currentRank,
    bestRank,
    worstRank,
    totalTeams: teams.length,
    remaining: remaining.length,
    bracketTeams,
    currentlyIn: bracketTeams > 0 && currentRank <= bracketTeams,
    clinched: bracketTeams > 0 && worstRank <= bracketTeams,
    eliminated: bracketTeams > 0 && bestRank > bracketTeams,
  };
}
