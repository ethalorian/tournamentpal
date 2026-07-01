// Single-elimination winner progression. Pure — no DB/framework.

export type BracketGameLite = {
  id: string;
  round: number;
  pos: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

export type BracketAdvance = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
};

function winnerOf(g: BracketGameLite): string | null {
  // Round-1 bye: exactly one team is present (the paired seed doesn't exist), so
  // that team — a top seed under standard seeding — advances without playing.
  if (g.round === 1) {
    const homePresent = g.home_team_id != null;
    const awayPresent = g.away_team_id != null;
    if (homePresent !== awayPresent) return homePresent ? g.home_team_id : g.away_team_id;
  }
  if (g.status !== "final" || g.home_score == null || g.away_score == null) return null;
  if (g.home_score > g.away_score) return g.home_team_id;
  if (g.away_score > g.home_score) return g.away_team_id;
  return null; // ties don't advance
}

/**
 * Given all bracket games (any rounds, with round 1 already seeded), compute
 * which later-round games should have which teams, cascading winners forward.
 * Returns only the games whose home/away needs to change. Idempotent.
 */
export function computeBracketAdvancement(games: BracketGameLite[]): BracketAdvance[] {
  const byRound = new Map<number, BracketGameLite[]>();
  for (const g of games) {
    const arr = byRound.get(g.round);
    if (arr) arr.push(g);
    else byRound.set(g.round, [g]);
  }
  for (const arr of byRound.values()) arr.sort((a, b) => a.pos - b.pos);

  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const updates: BracketAdvance[] = [];

  for (let ri = 1; ri < rounds.length; ri++) {
    const prev = byRound.get(rounds[ri - 1])!;
    const cur = byRound.get(rounds[ri])!;
    cur.forEach((g, p) => {
      const home = prev[2 * p] ? winnerOf(prev[2 * p]) : null;
      const away = prev[2 * p + 1] ? winnerOf(prev[2 * p + 1]) : null;
      if (home !== g.home_team_id || away !== g.away_team_id) {
        updates.push({ id: g.id, home_team_id: home, away_team_id: away });
      }
      // Apply in-memory so a completed intermediate round cascades in one pass.
      g.home_team_id = home;
      g.away_team_id = away;
    });
  }

  return updates;
}
