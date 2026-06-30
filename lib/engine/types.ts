// Pure, framework-free domain types for the tournament engine.
// Nothing here imports React, Next or Supabase so it stays unit-testable.

export type Rules = {
  /** Ordered list of tiebreaker keys, applied in sequence. */
  tiebreakers: TiebreakerKey[];
  /** Run-rule (mercy) margin, e.g. 10 after 5 innings. 0 = off. */
  runRule: number;
  /** Pool game time limit in minutes. 0 = none. */
  timeLimitMins: number;
};

export type TiebreakerKey =
  | "headToHead"
  | "runDiff"
  | "runsAllowed"
  | "runsScored"
  | "coinFlip";

export type FormatPreset = {
  id: string;
  name: string;
  blurb: string;
  minTeams: number;
  maxTeams: number;
  /** null = no pool stage (straight bracket). */
  pool: { size: number } | null;
  /** Single elimination bracket of the top N teams. 0 = no bracket. */
  bracketTeams: number;
};

export type EngineTeam = {
  id: string;
  name: string;
  /** Lower seed = stronger. Optional; sequential order used if absent. */
  seed?: number | null;
};

export type EngineField = {
  id: string;
  name: string;
  allowedDivisions: string[]; // empty = any division allowed
};

export type PlannedGame = {
  /** Stable key used to dedupe / reconcile. */
  key: string;
  stage: "pool" | "bracket";
  round: number;
  poolName?: string;
  bracketSlot?: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeSeed?: number | null;
  awaySeed?: number | null;
};

export type ScheduledGame = PlannedGame & {
  fieldId: string | null;
  scheduledAt: string | null; // ISO
  conflict?: string | null;
};

export type GameResult = {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string; // 'final' counts toward standings
};

export type StandingRow = {
  teamId: string;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  runsScored: number;
  runsAllowed: number;
  runDiff: number;
  played: number;
  winPct: number;
  rank: number;
};
