import type {
  EngineField,
  EngineTeam,
  FormatPreset,
  PlannedGame,
  ScheduledGame,
} from "./types";
import { powerOfTwoCeil } from "./presets";

/** Order teams by seed (asc); teams without a seed keep input order, last. */
export function orderBySeed(teams: EngineTeam[]): EngineTeam[] {
  return [...teams].sort((a, b) => {
    const sa = a.seed ?? Number.POSITIVE_INFINITY;
    const sb = b.seed ?? Number.POSITIVE_INFINITY;
    if (sa !== sb) return sa - sb;
    return 0;
  });
}

/**
 * Distribute teams into balanced pools using a serpentine (snake) pattern so
 * seed strength is spread evenly. Returns pools as arrays of teams.
 */
export function buildPools(
  teams: EngineTeam[],
  poolSize: number
): { name: string; teams: EngineTeam[] }[] {
  const ordered = orderBySeed(teams);
  const poolCount = Math.max(1, Math.round(ordered.length / poolSize));
  const pools: EngineTeam[][] = Array.from({ length: poolCount }, () => []);

  let dir = 1;
  let idx = 0;
  for (const team of ordered) {
    pools[idx].push(team);
    if (dir === 1) {
      if (idx === poolCount - 1) dir = -1;
      else idx++;
    } else {
      if (idx === 0) dir = 1;
      else idx--;
    }
  }

  return pools
    .filter((p) => p.length > 0)
    .map((teams, i) => ({ name: `Pool ${String.fromCharCode(65 + i)}`, teams }));
}

/**
 * Round-robin pairings via the circle method. Returns an array of rounds,
 * each round being a list of [home, away] team-id pairs. A null entry is a bye.
 */
export function roundRobin(teamIds: string[]): [string, string][][] {
  const ids = [...teamIds];
  if (ids.length < 2) return [];
  const bye = "__BYE__";
  if (ids.length % 2 === 1) ids.push(bye);

  const n = ids.length;
  const rounds: [string, string][][] = [];
  const fixed = ids[0];
  let rotating = ids.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    const left = [fixed, ...rotating].slice(0, n / 2);
    const right = [fixed, ...rotating].slice(n / 2).reverse();
    for (let i = 0; i < n / 2; i++) {
      const home = left[i];
      const away = right[i];
      if (home !== bye && away !== bye) {
        // Alternate home/away across rounds for fairness.
        if (r % 2 === 0) round.push([home, away]);
        else round.push([away, home]);
      }
    }
    rounds.push(round);
    // rotate
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }
  return rounds;
}

/** Standard bracket seed order for a power-of-two size (1-indexed seeds). */
export function bracketSeedOrder(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const sum = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(sum - s);
    }
    seeds = next;
  }
  return seeds;
}

function roundName(teamsInRound: number): string {
  switch (teamsInRound) {
    case 2:
      return "Final";
    case 4:
      return "Semifinal";
    case 8:
      return "Quarterfinal";
    case 16:
      return "Round of 16";
    case 32:
      return "Round of 32";
    default:
      return `Round of ${teamsInRound}`;
  }
}

/**
 * Build a single-elimination bracket skeleton. First-round games carry seed
 * numbers (1..bracketSize); later rounds are placeholders to be filled as
 * results come in. If `teamsBySeed` is provided, first-round team ids are set.
 */
export function buildSingleElim(
  bracketSize: number,
  teamsBySeed?: (string | null)[]
): PlannedGame[] {
  const size = powerOfTwoCeil(bracketSize);
  const order = bracketSeedOrder(size);
  const games: PlannedGame[] = [];

  // First round
  const firstRoundGames = size / 2;
  for (let i = 0; i < firstRoundGames; i++) {
    const homeSeed = order[i * 2];
    const awaySeed = order[i * 2 + 1];
    const homeId = teamsBySeed ? teamsBySeed[homeSeed - 1] ?? null : null;
    const awayId = teamsBySeed ? teamsBySeed[awaySeed - 1] ?? null : null;
    games.push({
      key: `bracket-r1-g${i + 1}`,
      stage: "bracket",
      round: 1,
      pos: i,
      bracketSlot: `${roundName(size)} ${i + 1}`,
      homeSeed,
      awaySeed,
      homeTeamId: homeId,
      awayTeamId: awayId,
    });
  }

  // Subsequent rounds (placeholders)
  let teamsInRound = size / 2;
  let round = 2;
  while (teamsInRound >= 2) {
    const gamesThisRound = teamsInRound / 2;
    for (let i = 0; i < gamesThisRound; i++) {
      games.push({
        key: `bracket-r${round}-g${i + 1}`,
        stage: "bracket",
        round,
        pos: i,
        bracketSlot:
          gamesThisRound === 1
            ? roundName(teamsInRound)
            : `${roundName(teamsInRound)} ${i + 1}`,
        homeSeed: null,
        awaySeed: null,
        homeTeamId: null,
        awayTeamId: null,
      });
    }
    teamsInRound = teamsInRound / 2;
    round++;
  }

  return games;
}

/**
 * Plan every game for a tournament from teams + preset. Pool games get real
 * team ids; bracket games are seeded placeholders (filled after pool play).
 */
export function planTournament(
  teams: EngineTeam[],
  preset: FormatPreset
): PlannedGame[] {
  const games: PlannedGame[] = [];

  if (preset.pool) {
    const pools = buildPools(teams, preset.pool.size);
    for (const pool of pools) {
      const rounds = roundRobin(pool.teams.map((t) => t.id));
      rounds.forEach((round, ri) => {
        round.forEach(([home, away], gi) => {
          games.push({
            key: `pool-${pool.name}-r${ri + 1}-g${gi + 1}`,
            stage: "pool",
            round: ri + 1,
            poolName: pool.name,
            homeTeamId: home,
            awayTeamId: away,
          });
        });
      });
    }
    if (preset.bracketTeams > 0) {
      games.push(...buildSingleElim(preset.bracketTeams));
    }
  } else {
    // Straight single elimination — teams seeded directly.
    const ordered = orderBySeed(teams);
    const size = powerOfTwoCeil(ordered.length);
    const bySeed: (string | null)[] = Array.from({ length: size }, (_, i) =>
      i < ordered.length ? ordered[i].id : null
    );
    games.push(...buildSingleElim(ordered.length, bySeed));
  }

  return games;
}

/**
 * Assign fields and start times to games, avoiding (a) a team playing two games
 * at once and (b) a field hosting a division it isn't sized for. Conflicts that
 * can't be resolved are flagged rather than dropped.
 */
export function assignFieldsAndTimes(
  games: PlannedGame[],
  fields: EngineField[],
  opts: {
    startISO: string;
    slotMinutes: number;
    divisionName?: string;
  }
): ScheduledGame[] {
  const start = new Date(opts.startISO).getTime();
  const slotMs = opts.slotMinutes * 60_000;

  // Eligible fields for this division.
  const eligible = fields.filter(
    (f) =>
      f.allowedDivisions.length === 0 ||
      !opts.divisionName ||
      f.allowedDivisions.includes(opts.divisionName)
  );

  // Track, per field, the next free slot index; and per team, busy slot set.
  const fieldNextSlot = new Map<string, number>();
  eligible.forEach((f) => fieldNextSlot.set(f.id, 0));
  const teamBusySlots = new Map<string, Set<number>>();

  const out: ScheduledGame[] = [];
  // Schedule pool rounds in order so each round roughly shares a time block.
  const sorted = [...games].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage === "pool" ? -1 : 1;
    return a.round - b.round;
  });

  for (const g of sorted) {
    if (eligible.length === 0) {
      out.push({
        ...g,
        fieldId: null,
        scheduledAt: null,
        conflict: opts.divisionName
          ? `No field allows ${opts.divisionName}`
          : "No eligible field",
      });
      continue;
    }

    const home = g.homeTeamId;
    const away = g.awayTeamId;

    // Bracket placeholders with unknown teams: place but don't worry about clashes.
    let placed = false;
    // Try fields in order of earliest availability.
    const fieldsByAvail = [...eligible].sort(
      (a, b) => (fieldNextSlot.get(a.id) ?? 0) - (fieldNextSlot.get(b.id) ?? 0)
    );

    for (const field of fieldsByAvail) {
      let slot = fieldNextSlot.get(field.id) ?? 0;
      // Advance slot until neither team is busy at that slot.
      let guard = 0;
      while (guard < 500) {
        const homeBusy = home ? teamBusySlots.get(home)?.has(slot) : false;
        const awayBusy = away ? teamBusySlots.get(away)?.has(slot) : false;
        if (!homeBusy && !awayBusy) break;
        slot++;
        guard++;
      }
      const scheduledAt = new Date(start + slot * slotMs).toISOString();
      out.push({ ...g, fieldId: field.id, scheduledAt, conflict: null });
      fieldNextSlot.set(field.id, slot + 1);
      if (home) (teamBusySlots.get(home) ?? setNew(teamBusySlots, home)).add(slot);
      if (away) (teamBusySlots.get(away) ?? setNew(teamBusySlots, away)).add(slot);
      placed = true;
      break;
    }

    if (!placed) {
      out.push({ ...g, fieldId: null, scheduledAt: null, conflict: "Unresolved conflict" });
    }
  }

  return out;
}

function setNew(m: Map<string, Set<number>>, k: string): Set<number> {
  const s = new Set<number>();
  m.set(k, s);
  return s;
}
