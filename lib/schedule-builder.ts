import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import {
  buildPools,
  applyPoolMatchups,
  roundRobin,
  buildSingleElim,
  assignSchedule,
  hhmmToMinutes,
} from "@/lib/engine/schedule";
import { getPreset } from "@/lib/engine/presets";
import { computeBracketAdvancement } from "@/lib/engine/bracket";
import type {
  ConstrainedGame,
  DivisionWindow,
  EngineField,
  EngineTeam,
  MatchupConstraint,
  SlotConfig,
  TeamConstraint,
} from "@/lib/engine/types";

/** Default daylight window + timing when a director hasn't set one. */
const DEFAULT_SCHEDULE = {
  dayStart: "08:00",
  dayEnd: "20:00",
  gameLengthMins: 90,
  bufferMins: 15,
};

export type ScheduleConfig = typeof DEFAULT_SCHEDULE;

/** Inclusive list of calendar days ("YYYY-MM-DD") for a tournament. */
function enumerateDays(start: string | null, end: string | null): string[] {
  const s = start ? new Date(`${start}T00:00:00.000Z`) : new Date();
  const e = end ? new Date(`${end}T00:00:00.000Z`) : s;
  const days: string[] = [];
  for (let d = new Date(s); d.getTime() <= e.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
    if (days.length > 60) break; // safety
  }
  return days.length ? days : [new Date().toISOString().slice(0, 10)];
}

type SB = SupabaseClient<Database>;
type Team = Tables<"teams">;
type Field = Tables<"fields">;
type Division = Tables<"divisions">;
type Tournament = Tables<"tournaments">;

type FormatConfig = {
  presetId: string;
  poolSize?: number;
  bracketTeams?: number;
};

/**
 * Regenerate the full schedule for a tournament: clears any prior pools/games,
 * builds pools + round-robin pool games + a seeded bracket skeleton per
 * division, assigns fields and times, and persists everything.
 *
 * Returns a small summary used by the review screen.
 */
export async function regenerateSchedule(
  supabase: SB,
  tournament: Tournament
): Promise<{ poolGames: number; bracketGames: number; conflicts: number }> {
  const tId = tournament.id;
  const format = (tournament.format ?? {}) as FormatConfig;
  const preset = getPreset(format.presetId);
  if (!preset) throw new Error("Pick a format before generating the schedule.");

  const poolSize = format.poolSize ?? preset.pool?.size ?? 4;
  const bracketTeams = format.bracketTeams ?? preset.bracketTeams;

  const [{ data: teams }, { data: fields }, { data: divisions }] = await Promise.all([
    supabase.from("teams").select("*").eq("tournament_id", tId),
    supabase.from("fields").select("*").eq("tournament_id", tId),
    supabase.from("divisions").select("*").eq("tournament_id", tId).order("sort"),
  ]);

  const allTeams = (teams ?? []) as Team[];
  const allFields = (fields ?? []) as Field[];
  const allDivisions = (divisions ?? []) as Division[];

  // Wipe prior generation (children cascade where defined; be explicit).
  await supabase.from("games").delete().eq("tournament_id", tId);
  await supabase.from("pool_teams").delete().eq("tournament_id", tId);
  await supabase.from("pools").delete().eq("tournament_id", tId);

  // Group teams by division (or one null group).
  const groups: { division: Division | null; teams: Team[] }[] =
    allDivisions.length > 0
      ? allDivisions.map((d) => ({
          division: d,
          teams: allTeams.filter((t) => t.division_id === d.id),
        }))
      : [{ division: null, teams: allTeams }];

  // Build the slot grid + hard constraints from config and per-row settings.
  const cfg = { ...DEFAULT_SCHEDULE, ...((tournament.schedule_config ?? {}) as Partial<ScheduleConfig>) };
  const slot: SlotConfig = {
    days: enumerateDays(tournament.start_date, tournament.end_date),
    dayStartMin: hhmmToMinutes(cfg.dayStart) ?? 480,
    dayEndMin: hhmmToMinutes(cfg.dayEnd) ?? 1200,
    gameLengthMins: cfg.gameLengthMins || 90,
    bufferMins: cfg.bufferMins ?? 15,
    timeZone: tournament.timezone || "America/New_York",
  };

  const eligibleFields: EngineField[] = allFields.map((f) => ({
    id: f.id,
    name: f.name,
    allowedDivisions: f.allowed_divisions ?? [],
  }));

  const teamConstraints = new Map<string, TeamConstraint>();
  for (const t of allTeams) {
    teamConstraints.set(t.id, {
      allowedFieldIds: t.allowed_field_ids ?? [],
      availStartMin: hhmmToMinutes(t.avail_start),
      availEndMin: hhmmToMinutes(t.avail_end),
    });
  }

  const divisionWindows = new Map<string, DivisionWindow>();
  for (const d of allDivisions) {
    divisionWindows.set(d.name, {
      startMin: hhmmToMinutes(d.window_start),
      endMin: hhmmToMinutes(d.window_end),
    });
  }

  // Director-set matchup rules (stored on schedule_config). forbid/force apply
  // within a division; separate can cross divisions.
  const matchups =
    ((tournament.schedule_config ?? {}) as { matchups?: MatchupConstraint[] }).matchups ?? [];
  const teamIds = new Set(allTeams.map((t) => t.id));
  const valid = matchups.filter((m) => m.a && m.b && m.a !== m.b && teamIds.has(m.a) && teamIds.has(m.b));
  const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);
  const forbidPairs = new Set(valid.filter((m) => m.type === "forbid").map((m) => pairKey(m.a, m.b)));

  // Symmetric team→partners map for time separation.
  const separations = new Map<string, Set<string>>();
  const link = (x: string, y: string) => {
    if (!separations.has(x)) separations.set(x, new Set());
    separations.get(x)!.add(y);
  };
  for (const m of valid) {
    if (m.type === "separate") {
      link(m.a, m.b);
      link(m.b, m.a);
    }
  }

  // Plan every division's games first, then place them all together so fields
  // are never double-booked across divisions.
  const planned: ConstrainedGame[] = [];
  const poolIdByKey = new Map<string, string>(); // `${divId}::${poolName}`

  for (const group of groups) {
    if (group.teams.length < 2) continue;
    const divId = group.division?.id ?? null;
    const divName = group.division?.name;

    const engTeams: EngineTeam[] = group.teams.map((t) => ({
      id: t.id,
      name: t.name,
      seed: t.seed,
    }));

    if (preset.pool) {
      // Force/forbid only bind teams within this division.
      const inGroup = new Set(engTeams.map((t) => t.id));
      const force = valid
        .filter((m) => m.type === "force" && inGroup.has(m.a) && inGroup.has(m.b))
        .map((m) => [m.a, m.b] as [string, string]);
      const forbid = valid
        .filter((m) => m.type === "forbid" && inGroup.has(m.a) && inGroup.has(m.b))
        .map((m) => [m.a, m.b] as [string, string]);
      const pools = applyPoolMatchups(buildPools(engTeams, poolSize), force, forbid);

      const { data: poolRows } = await supabase
        .from("pools")
        .insert(pools.map((p) => ({ tournament_id: tId, division_id: divId, name: p.name })))
        .select();

      for (const p of pools) {
        const row = (poolRows ?? []).find(
          (r) => r.name === p.name && (r.division_id ?? null) === divId
        );
        if (!row) continue;
        poolIdByKey.set(`${divId}::${p.name}`, row.id);
        await supabase
          .from("pool_teams")
          .insert(p.teams.map((t) => ({ tournament_id: tId, pool_id: row.id, team_id: t.id })));

        const rounds = roundRobin(p.teams.map((t) => t.id));
        rounds.forEach((round, ri) => {
          round.forEach(([home, away], gi) => {
            // Drop a forbidden pairing that still shares a pool.
            if (forbidPairs.has(pairKey(home, away))) return;
            planned.push({
              key: `${divId}-pool-${p.name}-r${ri + 1}-g${gi + 1}`,
              stage: "pool",
              round: ri + 1,
              poolName: p.name,
              homeTeamId: home,
              awayTeamId: away,
              divisionId: divId,
              divisionName: divName,
            });
          });
        });
      }

      if (bracketTeams > 0) {
        for (const bg of buildSingleElim(bracketTeams)) {
          planned.push({ ...bg, key: `${divId}-${bg.key}`, divisionId: divId, divisionName: divName });
        }
      }
    } else {
      const ordered = [...engTeams].sort((a, b) => (a.seed ?? 1e9) - (b.seed ?? 1e9));
      const bySeed = ordered.map((t) => t.id);
      for (const bg of buildSingleElim(ordered.length, bySeed)) {
        planned.push({ ...bg, key: `${divId}-${bg.key}`, divisionId: divId, divisionName: divName });
      }
    }
  }

  const scheduled = assignSchedule(planned, eligibleFields, {
    slot,
    teamConstraints,
    divisionWindows,
    separations,
  });

  const gameRows: Database["public"]["Tables"]["games"]["Insert"][] = [];
  let poolGameCount = 0;
  let bracketGameCount = 0;
  let conflictCount = 0;

  for (const g of scheduled) {
    if (g.conflict) conflictCount++;
    if (g.stage === "pool") poolGameCount++;
    else bracketGameCount++;
    gameRows.push({
      tournament_id: tId,
      division_id: g.divisionId ?? null,
      pool_id: g.poolName ? poolIdByKey.get(`${g.divisionId}::${g.poolName}`) ?? null : null,
      field_id: g.fieldId,
      stage: g.stage,
      round: g.round,
      bracket_pos: g.pos ?? null,
      bracket_slot: g.bracketSlot ?? null,
      home_team_id: g.homeTeamId,
      away_team_id: g.awayTeamId,
      home_seed: g.homeSeed ?? null,
      away_seed: g.awaySeed ?? null,
      scheduled_at: g.scheduledAt,
      status: "scheduled",
    });
  }

  if (gameRows.length > 0) {
    // Insert in chunks to stay well under payload limits.
    for (let i = 0; i < gameRows.length; i += 200) {
      await supabase.from("games").insert(gameRows.slice(i, i + 200));
    }
  }

  return {
    poolGames: poolGameCount,
    bracketGames: bracketGameCount,
    conflicts: conflictCount,
  };
}

/**
 * Recompute bracket team slots from posted results and persist any changes.
 * Call after a bracket score is posted (or after seeding round 1).
 */
export async function advanceBracket(supabase: SB, tournamentId: string): Promise<number> {
  const { data: bracket } = await supabase
    .from("games")
    .select("id,round,bracket_pos,home_team_id,away_team_id,home_score,away_score,status")
    .eq("tournament_id", tournamentId)
    .eq("stage", "bracket");

  const games = (bracket ?? []).map((g) => ({
    id: g.id,
    round: g.round,
    pos: g.bracket_pos ?? 0,
    home_team_id: g.home_team_id,
    away_team_id: g.away_team_id,
    home_score: g.home_score,
    away_score: g.away_score,
    status: g.status,
  }));

  const updates = computeBracketAdvancement(games);
  for (const u of updates) {
    await supabase
      .from("games")
      .update({ home_team_id: u.home_team_id, away_team_id: u.away_team_id })
      .eq("id", u.id);
  }
  return updates.length;
}
