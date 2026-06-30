import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import {
  buildPools,
  roundRobin,
  buildSingleElim,
} from "@/lib/engine/schedule";
import { assignFieldsAndTimes } from "@/lib/engine/schedule";
import { getPreset } from "@/lib/engine/presets";
import type { EngineField, EngineTeam, PlannedGame } from "@/lib/engine/types";

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

  const startISO = startOfPlay(tournament.start_date);
  const slotMinutes = 90;

  const gameRows: Database["public"]["Tables"]["games"]["Insert"][] = [];
  let poolGameCount = 0;
  let bracketGameCount = 0;
  let conflictCount = 0;

  for (const group of groups) {
    if (group.teams.length < 2) continue;

    const engTeams: EngineTeam[] = group.teams.map((t) => ({
      id: t.id,
      name: t.name,
      seed: t.seed,
    }));

    const eligibleFields: EngineField[] = allFields.map((f) => ({
      id: f.id,
      name: f.name,
      allowedDivisions: f.allowed_divisions ?? [],
    }));

    const planned: PlannedGame[] = [];
    const poolIdByName = new Map<string, string>();

    if (preset.pool) {
      const pools = buildPools(engTeams, poolSize);

      // Persist pools, capture ids.
      const { data: poolRows } = await supabase
        .from("pools")
        .insert(
          pools.map((p) => ({
            tournament_id: tId,
            division_id: group.division?.id ?? null,
            name: p.name,
          }))
        )
        .select();

      for (const p of pools) {
        const row = (poolRows ?? []).find((r) => r.name === p.name);
        if (!row) continue;
        poolIdByName.set(p.name, row.id);
        // pool_teams membership
        await supabase.from("pool_teams").insert(
          p.teams.map((t) => ({ tournament_id: tId, pool_id: row.id, team_id: t.id }))
        );
        // round-robin games
        const rounds = roundRobin(p.teams.map((t) => t.id));
        rounds.forEach((round, ri) => {
          round.forEach(([home, away], gi) => {
            planned.push({
              key: `pool-${p.name}-r${ri + 1}-g${gi + 1}`,
              stage: "pool",
              round: ri + 1,
              poolName: p.name,
              homeTeamId: home,
              awayTeamId: away,
            });
          });
        });
      }

      if (bracketTeams > 0) {
        planned.push(...buildSingleElim(bracketTeams));
      }
    } else {
      // Straight single elimination — seed teams directly.
      const ordered = [...engTeams].sort(
        (a, b) => (a.seed ?? 1e9) - (b.seed ?? 1e9)
      );
      const bySeed = ordered.map((t) => t.id);
      planned.push(...buildSingleElim(ordered.length, bySeed));
    }

    const scheduled = assignFieldsAndTimes(planned, eligibleFields, {
      startISO,
      slotMinutes,
      divisionName: group.division?.name,
    });

    for (const g of scheduled) {
      if (g.conflict) conflictCount++;
      if (g.stage === "pool") poolGameCount++;
      else bracketGameCount++;
      gameRows.push({
        tournament_id: tId,
        division_id: group.division?.id ?? null,
        pool_id: g.poolName ? poolIdByName.get(g.poolName) ?? null : null,
        field_id: g.fieldId,
        stage: g.stage,
        round: g.round,
        bracket_slot: g.bracketSlot ?? null,
        home_team_id: g.homeTeamId,
        away_team_id: g.awayTeamId,
        home_seed: g.homeSeed ?? null,
        away_seed: g.awaySeed ?? null,
        scheduled_at: g.scheduledAt,
        status: "scheduled",
      });
    }
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

function startOfPlay(date: string | null): string {
  const base = date ? new Date(`${date}T09:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString();
  return base.toISOString();
}
