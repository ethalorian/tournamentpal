import type {
  ConstrainedGame,
  DivisionWindow,
  EngineField,
  EngineTeam,
  FormatPreset,
  PlannedGame,
  ScheduledGame,
  SlotConfig,
  TeamConstraint,
} from "./types";
import { powerOfTwoCeil } from "./presets";
import { wallTimeToUtcMs } from "./time";

/** Parse "HH:MM" into minutes from midnight; null/blank -> null. */
export function hhmmToMinutes(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return Number.isFinite(min) ? min : null;
}

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

type Pool = { name: string; teams: EngineTeam[] };

/**
 * Adjust pools (best-effort, size-preserving swaps) so that:
 *   • every `force` pair shares a pool (they'll meet in round-robin), and
 *   • every `forbid` pair sits in different pools.
 * Both inputs are lists of [teamIdA, teamIdB]. With a single pool, force is
 * automatically satisfied and forbid can't be (the caller drops that game).
 * Constraints that can't be reconciled are left as-is rather than thrown.
 */
export function applyPoolMatchups(
  pools: Pool[],
  force: [string, string][],
  forbid: [string, string][]
): Pool[] {
  const result: Pool[] = pools.map((p) => ({ name: p.name, teams: [...p.teams] }));
  const poolOf = (id: string) => result.findIndex((p) => p.teams.some((t) => t.id === id));

  // FORCE: pull b into a's pool, swapping out a non-anchor team to keep sizes.
  for (const [a, b] of force) {
    const pa = poolOf(a);
    const pb = poolOf(b);
    if (pa < 0 || pb < 0 || pa === pb) continue;
    const bTeam = result[pb].teams.find((t) => t.id === b);
    const swap = result[pa].teams.find((t) => t.id !== a);
    if (!bTeam || !swap) continue;
    result[pb].teams = result[pb].teams.filter((t) => t.id !== b).concat(swap);
    result[pa].teams = result[pa].teams.filter((t) => t.id !== swap.id).concat(bTeam);
  }

  // FORBID: if a pair shares a pool, move b to another pool via a swap.
  for (const [a, b] of forbid) {
    const pa = poolOf(a);
    if (pa < 0 || poolOf(b) !== pa) continue;
    const otherIdx = result.findIndex((p, i) => i !== pa && p.teams.length > 0);
    if (otherIdx < 0) continue;
    const bTeam = result[pa].teams.find((t) => t.id === b);
    // Don't swap back a team that is forced-with or forbidden-against b's stayers.
    const swap = result[otherIdx].teams[0];
    if (!bTeam || !swap) continue;
    result[pa].teams = result[pa].teams.filter((t) => t.id !== b).concat(swap);
    result[otherIdx].teams = result[otherIdx].teams.filter((t) => t.id !== swap.id).concat(bTeam);
  }

  return result;
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

/**
 * Constraint-aware scheduler. Places every game onto a concrete (field, time)
 * across all divisions at once — so a field is never double-booked between
 * divisions — while enforcing, as HARD rules:
 *   • the daily slot window (start/end/game length/buffer),
 *   • field → division eligibility,
 *   • team → allowed fields,
 *   • division time windows,
 *   • team availability windows,
 *   • no team playing two games at once.
 * Games that can't be placed without breaking a rule are returned unplaced with
 * a conflict reason rather than forced into a bad slot.
 */
export function assignSchedule<G extends ConstrainedGame>(
  games: G[],
  fields: EngineField[],
  opts: {
    slot: SlotConfig;
    teamConstraints: Map<string, TeamConstraint>;
    divisionWindows: Map<string, DivisionWindow>; // keyed by division name
    // Teams that must not share a time slot (keyed by team id → partner ids).
    // Enforced symmetrically; may span divisions (shared coach/players).
    separations?: Map<string, Set<string>>;
    // Per-window division allowlist, keyed `${day}__${timeMin}` → division names.
    // A window with entries only admits those divisions; absent/empty = open.
    windowDivisions?: Map<string, string[]>;
    // Per-day stage restriction, keyed by day ("YYYY-MM-DD") → "pool" | "bracket".
    // Days not listed allow both stages.
    dayStages?: Map<string, "pool" | "bracket">;
    // Per-day slot grid override: when pool play starts (minutes from midnight)
    // and how many windows that day. Days not listed use the uniform window.
    dayGrids?: Map<string, { startMin: number; windows: number }>;
    // Manual field assignments, keyed by game `key` → field id. A pinned game is
    // forced onto that field; every other game schedules around it.
    fieldPins?: Map<string, string>;
  }
): (G & { fieldId: string | null; scheduledAt: string | null; conflict: string | null })[] {
  const { gameLengthMins: gLen, bufferMins, dayStartMin, dayEndMin } = opts.slot;
  const step = Math.max(1, gLen + bufferMins);

  // Concrete slot grid across days, ordered chronologically. Wall-clock times
  // are interpreted in the tournament timezone, then stored as UTC instants.
  const tz = opts.slot.timeZone || "UTC";
  const slots: { ms: number; timeMin: number; day: string }[] = [];
  for (const day of opts.slot.days) {
    const grid = opts.dayGrids?.get(day);
    if (grid) {
      // Fixed number of windows from a per-day start time.
      for (let n = 0; n < grid.windows; n++) {
        const t = grid.startMin + n * step;
        if (t + gLen > 24 * 60) break;
        slots.push({ ms: wallTimeToUtcMs(day, t, tz), timeMin: t, day });
      }
    } else {
      for (let t = dayStartMin; t + gLen <= dayEndMin; t += step) {
        slots.push({ ms: wallTimeToUtcMs(day, t, tz), timeMin: t, day });
      }
    }
  }
  slots.sort((a, b) => a.ms - b.ms);

  const fieldBusy = new Map<string, Set<number>>();
  const teamBusy = new Map<string, Set<number>>();
  const teamLastField = new Map<string, string>(); // team id → last field played
  const busy = (m: Map<string, Set<number>>, k: string) =>
    m.get(k) ?? setNew(m, k);

  // Pool play first (earliest rounds first), then bracket.
  const sorted = [...games].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage === "pool" ? -1 : 1;
    return a.round - b.round;
  });

  const out: (G & { fieldId: string | null; scheduledAt: string | null; conflict: string | null })[] = [];

  for (const g of sorted) {
    const divWin = g.divisionName ? opts.divisionWindows.get(g.divisionName) : undefined;
    const homeC = g.homeTeamId ? opts.teamConstraints.get(g.homeTeamId) : undefined;
    const awayC = g.awayTeamId ? opts.teamConstraints.get(g.awayTeamId) : undefined;

    // Fields this game is allowed to use at all (division + team allowlists).
    let eligibleFields = fields.filter((f) => {
      if (f.allowedDivisions.length > 0 && g.divisionName && !f.allowedDivisions.includes(g.divisionName))
        return false;
      if (homeC?.allowedFieldIds.length && !homeC.allowedFieldIds.includes(f.id)) return false;
      if (awayC?.allowedFieldIds.length && !awayC.allowedFieldIds.includes(f.id)) return false;
      return true;
    });

    // A manually pinned game may only use its assigned field.
    const pinnedField = opts.fieldPins?.get(g.key);
    if (pinnedField) eligibleFields = eligibleFields.filter((f) => f.id === pinnedField);

    let placed = false;
    if (eligibleFields.length > 0) {
      for (let si = 0; si < slots.length; si++) {
        const timeMin = slots[si].timeMin;
        const endMin = timeMin + gLen;

        // Division & team time-of-day windows.
        if (divWin) {
          if (divWin.startMin != null && timeMin < divWin.startMin) continue;
          if (divWin.endMin != null && endMin > divWin.endMin) continue;
        }
        if (homeC) {
          if (homeC.availStartMin != null && timeMin < homeC.availStartMin) continue;
          if (homeC.availEndMin != null && endMin > homeC.availEndMin) continue;
        }
        if (awayC) {
          if (awayC.availStartMin != null && timeMin < awayC.availStartMin) continue;
          if (awayC.availEndMin != null && endMin > awayC.availEndMin) continue;
        }

        // Per-window division assignment: a tagged window only admits its
        // divisions (untagged windows are open to all).
        if (opts.windowDivisions && g.divisionName) {
          const allowed = opts.windowDivisions.get(`${slots[si].day}__${timeMin}`);
          if (allowed && allowed.length > 0 && !allowed.includes(g.divisionName)) continue;
        }

        // Per-day stage: pool-play days only take pool games, elimination days
        // only take bracket games. Untagged days take both.
        if (opts.dayStages) {
          const dayStage = opts.dayStages.get(slots[si].day);
          if (dayStage && dayStage !== g.stage) continue;
        }

        // A team can't already be playing in this slot.
        if (g.homeTeamId && busy(teamBusy, g.homeTeamId).has(si)) continue;
        if (g.awayTeamId && busy(teamBusy, g.awayTeamId).has(si)) continue;

        // Separated teams (shared coach/players) can't share this slot either.
        if (opts.separations) {
          const partnerPlaying = (teamId: string | null) => {
            if (!teamId) return false;
            const partners = opts.separations!.get(teamId);
            if (!partners) return false;
            for (const p of partners) if (busy(teamBusy, p).has(si)) return true;
            return false;
          };
          if (partnerPlaying(g.homeTeamId) || partnerPlaying(g.awayTeamId)) continue;
        }

        // Open eligible fields at this slot.
        const openFields = eligibleFields.filter((f) => !busy(fieldBusy, f.id).has(si));
        if (openFields.length === 0) continue;

        // Soft preference: keep a team on the field it just played (fewer moves
        // between back-to-back games). Falls back to the first open field.
        const homeLast = g.homeTeamId ? teamLastField.get(g.homeTeamId) : undefined;
        const awayLast = g.awayTeamId ? teamLastField.get(g.awayTeamId) : undefined;
        const field =
          openFields.find((f) => f.id === homeLast) ??
          openFields.find((f) => f.id === awayLast) ??
          openFields[0];

        busy(fieldBusy, field.id).add(si);
        if (g.homeTeamId) {
          busy(teamBusy, g.homeTeamId).add(si);
          teamLastField.set(g.homeTeamId, field.id);
        }
        if (g.awayTeamId) {
          busy(teamBusy, g.awayTeamId).add(si);
          teamLastField.set(g.awayTeamId, field.id);
        }
        out.push({
          ...g,
          fieldId: field.id,
          scheduledAt: new Date(slots[si].ms).toISOString(),
          conflict: null,
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      out.push({
        ...g,
        fieldId: null,
        scheduledAt: null,
        conflict:
          eligibleFields.length === 0
            ? "No field satisfies this game's restrictions"
            : "No open slot fits every restriction",
      });
    }
  }

  return out;
}
