import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPools,
  roundRobin,
  bracketSeedOrder,
  buildSingleElim,
  planTournament,
  assignFieldsAndTimes,
} from "./schedule";
import { computeStandings, DEFAULT_RULES } from "./standings";
import { computeBracketAdvancement } from "./bracket";
import { projectSeeding } from "./seeding";
import { suggestPreset, getPreset } from "./presets";
import type { EngineTeam, GameResult } from "./types";

function teams(n: number): EngineTeam[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));
}

test("roundRobin: each team plays every other exactly once", () => {
  const ids = ["a", "b", "c", "d"];
  const rounds = roundRobin(ids);
  const counts = new Map<string, number>();
  let games = 0;
  for (const r of rounds)
    for (const [h, a] of r) {
      games++;
      const key = [h, a].sort().join("-");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  assert.equal(games, 6); // C(4,2)
  for (const v of counts.values()) assert.equal(v, 1);
});

test("roundRobin: odd team count gives each team one bye (n rounds)", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const rounds = roundRobin(ids);
  assert.equal(rounds.length, 5);
  // 5 teams => C(5,2)=10 games total
  const total = rounds.reduce((s, r) => s + r.length, 0);
  assert.equal(total, 10);
});

test("buildPools: balanced and complete with snake distribution", () => {
  const pools = buildPools(teams(8), 4);
  assert.equal(pools.length, 2);
  const all = pools.flatMap((p) => p.teams.map((t) => t.id));
  assert.equal(new Set(all).size, 8);
  // Top two seeds should be split across pools (snake)
  assert.notEqual(pools[0].teams[0].id, pools[1].teams[0].id);
  assert.equal(pools[0].teams[0].id, "t1");
  assert.equal(pools[1].teams[0].id, "t2");
});

test("bracketSeedOrder: canonical 8-team order (1 & 2 in opposite halves)", () => {
  const order = bracketSeedOrder(8);
  assert.deepEqual(order, [1, 8, 4, 5, 2, 7, 3, 6]);
  // top half holds seed 1, bottom half holds seed 2 — they can only meet in the final
  assert.ok(order.slice(0, 4).includes(1));
  assert.ok(order.slice(4).includes(2));
  // every seed 1..8 present exactly once
  assert.deepEqual([...order].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("buildSingleElim: 8 teams => 7 games across 3 rounds", () => {
  const games = buildSingleElim(8);
  assert.equal(games.length, 7);
  const r1 = games.filter((g) => g.round === 1);
  assert.equal(r1.length, 4);
  // 1 vs 8 should be a first-round pairing
  assert.ok(r1.some((g) => g.homeSeed === 1 && g.awaySeed === 8));
});

test("buildSingleElim: non power of two rounds up with byes", () => {
  const games = buildSingleElim(6); // -> bracket of 8
  assert.equal(games.filter((g) => g.round === 1).length, 4);
});

test("planTournament: pools->bracket produces pool + bracket games", () => {
  const preset = getPreset("pools-to-bracket")!;
  const games = planTournament(teams(8), preset);
  const pool = games.filter((g) => g.stage === "pool");
  const bracket = games.filter((g) => g.stage === "bracket");
  // 2 pools of 4 => 2 * C(4,2)=12 pool games
  assert.equal(pool.length, 12);
  assert.ok(bracket.length > 0);
});

test("assignFieldsAndTimes: no team is double-booked in the same slot", () => {
  const preset = getPreset("round-robin")!;
  const games = planTournament(teams(6), preset);
  const fields = [
    { id: "f1", name: "Field 1", allowedDivisions: [] },
    { id: "f2", name: "Field 2", allowedDivisions: [] },
  ];
  const scheduled = assignFieldsAndTimes(games, fields, {
    startISO: "2026-07-01T09:00:00.000Z",
    slotMinutes: 90,
  });
  // group by time slot, ensure no team appears twice
  const bySlot = new Map<string, string[]>();
  for (const g of scheduled) {
    if (!g.scheduledAt) continue;
    const arr = bySlot.get(g.scheduledAt) ?? [];
    if (g.homeTeamId) arr.push(g.homeTeamId);
    if (g.awayTeamId) arr.push(g.awayTeamId);
    bySlot.set(g.scheduledAt, arr);
  }
  for (const [, ids] of bySlot) {
    assert.equal(new Set(ids).size, ids.length, "a team was double-booked");
  }
});

test("assignFieldsAndTimes: field age restriction flags conflict", () => {
  const preset = getPreset("round-robin")!;
  const games = planTournament(teams(4), preset);
  const fields = [{ id: "f1", name: "Small", allowedDivisions: ["10U"] }];
  const scheduled = assignFieldsAndTimes(games, fields, {
    startISO: "2026-07-01T09:00:00.000Z",
    slotMinutes: 90,
    divisionName: "16U",
  });
  assert.ok(scheduled.every((g) => g.fieldId === null && g.conflict));
});

test("computeStandings: win% ordering and run differential", () => {
  const t = teams(3);
  const games: GameResult[] = [
    { homeTeamId: "t1", awayTeamId: "t2", homeScore: 5, awayScore: 1, status: "final" },
    { homeTeamId: "t1", awayTeamId: "t3", homeScore: 7, awayScore: 0, status: "final" },
    { homeTeamId: "t2", awayTeamId: "t3", homeScore: 3, awayScore: 2, status: "final" },
  ];
  const s = computeStandings(t, games, DEFAULT_RULES);
  assert.equal(s[0].teamId, "t1"); // 2-0
  assert.equal(s[0].wins, 2);
  assert.equal(s[1].teamId, "t2"); // 1-1
  assert.equal(s[2].teamId, "t3"); // 0-2
  assert.equal(s[0].runDiff, 11);
});

test("computeStandings: head-to-head breaks a two-way tie", () => {
  const t = teams(2);
  const games: GameResult[] = [
    { homeTeamId: "t1", awayTeamId: "t2", homeScore: 2, awayScore: 1, status: "final" },
  ];
  const s = computeStandings(t, games, DEFAULT_RULES);
  // both 0 games except this one; t1 beat t2
  assert.equal(s[0].teamId, "t1");
});

test("computeStandings: ignores non-final games", () => {
  const t = teams(2);
  const games: GameResult[] = [
    { homeTeamId: "t1", awayTeamId: "t2", homeScore: 9, awayScore: 0, status: "scheduled" },
  ];
  const s = computeStandings(t, games, DEFAULT_RULES);
  assert.equal(s[0].played, 0);
});

test("computeBracketAdvancement: winners flow into the final", () => {
  const games = [
    { id: "f1", round: 1, pos: 0, home_team_id: "t1", away_team_id: "t4", home_score: 5, away_score: 2, status: "final" },
    { id: "f2", round: 1, pos: 1, home_team_id: "t2", away_team_id: "t3", home_score: 6, away_score: 1, status: "final" },
    { id: "F", round: 2, pos: 0, home_team_id: null, away_team_id: null, home_score: null, away_score: null, status: "scheduled" },
  ];
  const updates = computeBracketAdvancement(games);
  const finalUpdate = updates.find((u) => u.id === "F");
  assert.ok(finalUpdate);
  assert.equal(finalUpdate!.home_team_id, "t1");
  assert.equal(finalUpdate!.away_team_id, "t2");
});

test("computeBracketAdvancement: no advance until a game is final", () => {
  const games = [
    { id: "f1", round: 1, pos: 0, home_team_id: "t1", away_team_id: "t4", home_score: null, away_score: null, status: "scheduled" },
    { id: "f2", round: 1, pos: 1, home_team_id: "t2", away_team_id: "t3", home_score: 6, away_score: 1, status: "final" },
    { id: "F", round: 2, pos: 0, home_team_id: null, away_team_id: null, home_score: null, away_score: null, status: "scheduled" },
  ];
  const updates = computeBracketAdvancement(games);
  // Final's away is t2 (decided), home still null (f1 not final).
  const f = updates.find((u) => u.id === "F");
  assert.equal(f?.home_team_id ?? null, null);
  assert.equal(f?.away_team_id, "t2");
});

test("projectSeeding: current/best/worst range + clinch", () => {
  const t = teams(3); // t1,t2,t3
  const games = [
    { homeTeamId: "t1", awayTeamId: "t2", homeScore: 7, awayScore: 3, status: "final" },
    { homeTeamId: "t1", awayTeamId: "t3", homeScore: null, awayScore: null, status: "scheduled" },
    { homeTeamId: "t2", awayTeamId: "t3", homeScore: null, awayScore: null, status: "scheduled" },
  ];
  const o = projectSeeding(t, games, "t1", DEFAULT_RULES, 2);
  assert.equal(o.currentRank, 1);
  assert.equal(o.bestRank, 1);
  assert.ok(o.worstRank >= o.currentRank);
  assert.equal(o.remaining, 1); // t1 vs t3
  assert.ok(o.clinched); // 1-0 leader, worst case still top 2
  assert.equal(o.eliminated, false);
});

test("projectSeeding: no remaining games → best = worst = current", () => {
  const t = teams(3);
  const games = [
    { homeTeamId: "t1", awayTeamId: "t2", homeScore: 5, awayScore: 1, status: "final" },
    { homeTeamId: "t1", awayTeamId: "t3", homeScore: 6, awayScore: 0, status: "final" },
    { homeTeamId: "t2", awayTeamId: "t3", homeScore: 4, awayScore: 2, status: "final" },
  ];
  const o = projectSeeding(t, games, "t1", DEFAULT_RULES, 2);
  assert.equal(o.remaining, 0);
  assert.equal(o.bestRank, o.currentRank);
  assert.equal(o.worstRank, o.currentRank);
  assert.equal(o.currentRank, 1);
});

test("suggestPreset: scales with team count", () => {
  assert.equal(suggestPreset(4).id, "round-robin");
  assert.equal(suggestPreset(7).id, "pools-to-semis");
  assert.equal(suggestPreset(16).id, "pools-to-bracket");
});
