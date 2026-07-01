// Pure, dependency-free timezone math. Converts a wall-clock time in a given
// IANA timezone to the correct UTC instant, accounting for DST — without any
// external library (uses the built-in Intl API).

/** Offset (localTime - UTC) in ms for `instant` in `timeZone`. */
function tzOffsetMs(instant: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(instant));
  const m: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") m[p.type] = Number(p.value);
  const asUTC = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second);
  return asUTC - instant;
}

/**
 * The UTC instant whose wall-clock representation in `timeZone` is
 * `day` (YYYY-MM-DD) at `minutes` past midnight. Two-pass to be correct across
 * DST transitions. Falls back to UTC if the zone is invalid.
 */
export function wallTimeToUtcMs(day: string, minutes: number, timeZone: string): number {
  const [y, mo, d] = day.split("-").map(Number);
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  const naiveUTC = Date.UTC(y, mo - 1, d, hour, min);
  try {
    const off1 = tzOffsetMs(naiveUTC, timeZone);
    let utc = naiveUTC - off1;
    const off2 = tzOffsetMs(utc, timeZone);
    if (off2 !== off1) utc = naiveUTC - off2;
    return utc;
  } catch {
    return naiveUTC;
  }
}
