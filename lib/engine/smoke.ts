/**
 * End-to-end smoke test of the tournament engine — mirrors what
 * `regenerateSchedule` + `seedBracket` do in the app, minus the database.
 * Run with: npx tsx lib/engine/smoke.ts
 */
import {
  buildPools,
  roundRobin,
  buildSingleElim,
  assignFieldsAndTimes,
  bracketSeedOrder,
} from "./schedule";
import { computeStandings, DEFAULT_RULES } from "./standings";
import { powerOfTwoCeil } from "./presets";
import type { EngineTeam, GameResult, PlannedGame } from "./types";

const NAMES = [
  "Tigard Heat", "Cascade Crush", "River City Rays", "Summit Storm",
  "Bend Bandits", "Rose City Royals", "Coast Cannons", "Valley Vipers",
];
const teams: EngineTeam[] = NAMES.map((name, i) => ({ id: `t${i + 1}`, name, seed: i + 1 }));
const fields = [
  { id: "f1", name: "Diamond 1", allowedDivisions: [] },
  { id: "f2", name: "Diamond 2", allowedDivisions: [] },
];

const POOL_SIZE = 4;
const BRACKET_TEAMS = 4;

console.log("⚾ TournamentPal engine smoke test\n");

// 1. Pools
const pools = buildPools(teams, POOL_SIZE);
console.log(`Pools (${pools.length}):`);
for (const p of pools) console.log(`  ${p.name}: ${p.teams.map((t) => t.name).join(", ")}`);

// 2. Pool games
const planned: PlannedGame[] = [];
for (const p of pools) {
  roundRobin(p.teams.map((t) => t.id)).forEach((round, ri) =>
    round.forEach(([h, a], gi) =>
      planned.push({ key: `${p.name}-${ri}-${gi}`, stage: "pool", round: ri + 1, poolName: p.name, homeTeamId: h, awayTeamId: a })
    )
  );
}
planned.push(...buildSingleElim(BRACKET_TEAMS));

// 3. Schedule
const scheduled = assignFieldsAndTimes(planned, fields, {
  startISO: "2026-07-04T09:00:00.000Z",
  slotMinutes: 90,
});
const poolGames = scheduled.filter((g) => g.stage === "pool");
const conflicts = scheduled.filter((g) => g.conflict).length;
console.log(`\nPool games: ${poolGames.length}  •  Bracket placeholders: ${scheduled.length - poolGames.length}  •  Conflicts: ${conflicts}`);

// Assert no double-booking
const bySlot = new Map<string, string[]>();
for (const g of poolGames) {
  if (!g.scheduledAt) continue;
  const arr = bySlot.get(g.scheduledAt) ?? [];
  if (g.homeTeamId) arr.push(g.homeTeamId);
  if (g.awayTeamId) arr.push(g.awayTeamId);
  bySlot.set(g.scheduledAt, arr);
}
let clashes = 0;
for (const [, ids] of bySlot) if (new Set(ids).size !== ids.length) clashes++;
console.log(`Double-booking clashes: ${clashes} ${clashes === 0 ? "✓" : "✗"}`);

// 4. Simulate pool results: higher seed (lower number) usually wins.
const nameOf = new Map(teams.map((t) => [t.id, t.name]));
const results: GameResult[] = poolGames.map((g) => {
  const hs = Number((g.homeTeamId ?? "t9").slice(1));
  const as = Number((g.awayTeamId ?? "t9").slice(1));
  const homeWins = hs < as; // lower seed wins
  return {
    homeTeamId: g.homeTeamId,
    awayTeamId: g.awayTeamId,
    homeScore: homeWins ? 7 : 3,
    awayScore: homeWins ? 3 : 7,
    status: "final",
  };
});

// 5. Standings + seed bracket
const standings = computeStandings(teams, results, DEFAULT_RULES);
console.log("\nOverall standings:");
standings.forEach((r) =>
  console.log(`  ${String(r.rank).padStart(2)}. ${r.name.padEnd(18)} ${r.wins}-${r.losses}  diff ${r.runDiff >= 0 ? "+" : ""}${r.runDiff}`)
);

const seedToTeam = standings.slice(0, BRACKET_TEAMS).map((s) => s.teamId);
const order = bracketSeedOrder(powerOfTwoCeil(BRACKET_TEAMS));
console.log("\nBracket (semifinals):");
for (let i = 0; i < order.length; i += 2) {
  const home = seedToTeam[order[i] - 1];
  const away = seedToTeam[order[i + 1] - 1];
  console.log(`  #${order[i]} ${nameOf.get(home)}  vs  #${order[i + 1]} ${nameOf.get(away)}`);
}

// Assertions
const ok =
  clashes === 0 &&
  conflicts === 0 &&
  poolGames.length === 12 &&
  standings[0].rank === 1 &&
  seedToTeam.length === 4;
console.log(`\n${ok ? "✅ PASS" : "❌ FAIL"} — full pool→schedule→standings→bracket pipeline coherent`);
if (!ok) process.exit(1);
