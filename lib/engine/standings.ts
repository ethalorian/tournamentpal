import type {
  EngineTeam,
  GameResult,
  Rules,
  StandingRow,
  TiebreakerKey,
} from "./types";

export const DEFAULT_RULES: Rules = {
  tiebreakers: ["headToHead", "runDiff", "runsAllowed", "coinFlip"],
  runRule: 10,
  timeLimitMins: 75,
};

type Acc = {
  teamId: string;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  runsScored: number;
  runsAllowed: number;
};

/**
 * Compute pool/division standings from final games, breaking ties with the
 * director's ordered tiebreaker list. Head-to-head is computed only among the
 * exact set of teams that are still tied.
 */
export function computeStandings(
  teams: EngineTeam[],
  games: GameResult[],
  rules: Rules = DEFAULT_RULES
): StandingRow[] {
  const acc = new Map<string, Acc>();
  for (const t of teams) {
    acc.set(t.id, {
      teamId: t.id,
      name: t.name,
      wins: 0,
      losses: 0,
      ties: 0,
      runsScored: 0,
      runsAllowed: 0,
    });
  }

  const finals = games.filter(
    (g) =>
      g.status === "final" &&
      g.homeTeamId &&
      g.awayTeamId &&
      g.homeScore != null &&
      g.awayScore != null
  );

  for (const g of finals) {
    const h = acc.get(g.homeTeamId!);
    const a = acc.get(g.awayTeamId!);
    if (!h || !a) continue;
    const hs = g.homeScore!;
    const as = g.awayScore!;
    h.runsScored += hs;
    h.runsAllowed += as;
    a.runsScored += as;
    a.runsAllowed += hs;
    if (hs > as) {
      h.wins++;
      a.losses++;
    } else if (as > hs) {
      a.wins++;
      h.losses++;
    } else {
      h.ties++;
      a.ties++;
    }
  }

  const rows = [...acc.values()].map(toRow);

  // Stable sort: win% first, then the configured tiebreakers among ties.
  rows.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    return breakTie(a, b, rows, finals, rules.tiebreakers);
  });

  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

function toRow(a: Acc): StandingRow {
  const played = a.wins + a.losses + a.ties;
  const winPct = played === 0 ? 0 : (a.wins + a.ties * 0.5) / played;
  return {
    teamId: a.teamId,
    name: a.name,
    wins: a.wins,
    losses: a.losses,
    ties: a.ties,
    runsScored: a.runsScored,
    runsAllowed: a.runsAllowed,
    runDiff: a.runsScored - a.runsAllowed,
    played,
    winPct,
    rank: 0,
  };
}

function breakTie(
  a: StandingRow,
  b: StandingRow,
  allRows: StandingRow[],
  finals: GameResult[],
  order: TiebreakerKey[]
): number {
  for (const key of order) {
    let cmp = 0;
    switch (key) {
      case "headToHead": {
        // Only meaningful between teams with identical win%.
        const tiedGroup = allRows
          .filter((r) => r.winPct === a.winPct)
          .map((r) => r.teamId);
        cmp = headToHead(a.teamId, b.teamId, tiedGroup, finals);
        break;
      }
      case "runDiff":
        cmp = b.runDiff - a.runDiff;
        break;
      case "runsAllowed":
        cmp = a.runsAllowed - b.runsAllowed; // fewer is better
        break;
      case "runsScored":
        cmp = b.runsScored - a.runsScored;
        break;
      case "coinFlip":
        cmp = 0; // deterministic no-op; real coin flip is a manual director action
        break;
    }
    if (cmp !== 0) return cmp;
  }
  return 0;
}

/**
 * Head-to-head win differential between two teams, considering only games
 * played within the currently-tied group.
 */
function headToHead(
  teamA: string,
  teamB: string,
  tiedGroup: string[],
  finals: GameResult[]
): number {
  if (!tiedGroup.includes(teamA) || !tiedGroup.includes(teamB)) return 0;
  let aWins = 0;
  let bWins = 0;
  for (const g of finals) {
    const ids = [g.homeTeamId, g.awayTeamId];
    if (!ids.includes(teamA) || !ids.includes(teamB)) continue;
    const aScore = g.homeTeamId === teamA ? g.homeScore! : g.awayScore!;
    const bScore = g.homeTeamId === teamB ? g.homeScore! : g.awayScore!;
    if (aScore > bScore) aWins++;
    else if (bScore > aScore) bWins++;
  }
  return bWins - aWins; // a ranks ahead if it won more (negative => a first)
}

/** Map final standings to bracket seeds (1-indexed): returns team ids by seed. */
export function seedFromStandings(
  standings: StandingRow[],
  bracketTeams: number
): string[] {
  return standings.slice(0, bracketTeams).map((r) => r.teamId);
}
