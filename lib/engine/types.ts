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
  /** 0-based position within a bracket round (for winner progression). */
  pos?: number;
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

/** Daylight window + game length + buffer that define the concrete slot grid. */
export type SlotConfig = {
  days: string[]; // calendar days, e.g. ["2026-07-01"]
  dayStartMin: number; // minutes from midnight (e.g. 480 = 8:00am)
  dayEndMin: number; // last moment a game may still be in progress
  gameLengthMins: number;
  bufferMins: number;
  timeZone: string; // IANA tz the wall-clock window is expressed in
};

/** Per-team hard restrictions. Empty allowlist / null bound = unrestricted. */
export type TeamConstraint = {
  allowedFieldIds: string[]; // team only plays on these fields
  availStartMin: number | null; // can't start before
  availEndMin: number | null; // must finish by
};

/** A division may only play within this time-of-day window. */
export type DivisionWindow = {
  startMin: number | null;
  endMin: number | null;
};

/** A planned game tagged with its division for constraint resolution. */
export type ConstrainedGame = PlannedGame & {
  divisionId: string | null;
  divisionName?: string;
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
