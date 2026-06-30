import type { FormatPreset } from "./types";

/**
 * Preloaded formats. The wizard auto-fits these to the entered team count and
 * the director can fine-tune pool size / bracket size afterward (step 3e).
 */
export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: "pools-to-bracket",
    name: "Pool play → bracket",
    blurb:
      "Round-robin pools to seed a single-elimination bracket. The classic weekend format.",
    minTeams: 6,
    maxTeams: 64,
    pool: { size: 4 },
    bracketTeams: 8,
  },
  {
    id: "round-robin",
    name: "Round robin",
    blurb: "One pool, everyone plays everyone. Best record wins. No bracket.",
    minTeams: 3,
    maxTeams: 12,
    pool: { size: 12 },
    bracketTeams: 0,
  },
  {
    id: "single-elim",
    name: "Single elimination",
    blurb: "Straight seeded bracket. Win or go home from game one.",
    minTeams: 4,
    maxTeams: 64,
    pool: null,
    bracketTeams: 0, // bracket sized to all teams (power of two, byes filled)
  },
  {
    id: "pools-to-semis",
    name: "Pools → top-4 bracket",
    blurb: "Pool play to a four-team semifinal/final. Great for one-day events.",
    minTeams: 6,
    maxTeams: 24,
    pool: { size: 3 },
    bracketTeams: 4,
  },
];

export function getPreset(id: string): FormatPreset | undefined {
  return FORMAT_PRESETS.find((p) => p.id === id);
}

/** Suggest the best preset for a given team count. */
export function suggestPreset(teamCount: number): FormatPreset {
  if (teamCount <= 5) return getPreset("round-robin")!;
  if (teamCount <= 8) return getPreset("pools-to-semis")!;
  return getPreset("pools-to-bracket")!;
}

/** Largest power of two <= n (used to size brackets with byes). */
export function powerOfTwoFloor(n: number): number {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return Math.max(2, p);
}

/** Smallest power of two >= n. */
export function powerOfTwoCeil(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(2, p);
}
