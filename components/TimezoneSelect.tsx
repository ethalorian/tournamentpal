"use client";

import { useMemo, useState } from "react";
import { inputClass } from "@/components/ui";

/** Common US zones (label + IANA id). Covers the vast majority of events. */
const ZONES: { id: string; label: string }[] = [
  { id: "America/New_York", label: "Eastern (New York)" },
  { id: "America/Chicago", label: "Central (Chicago)" },
  { id: "America/Denver", label: "Mountain (Denver)" },
  { id: "America/Phoenix", label: "Arizona (no DST)" },
  { id: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { id: "America/Anchorage", label: "Alaska (Anchorage)" },
  { id: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { id: "America/Puerto_Rico", label: "Atlantic (Puerto Rico)" },
];

/**
 * Timezone picker. Defaults to the tournament's saved zone, or — on a new
 * event — the director's own browser timezone, which is almost always the
 * venue's. Submits an IANA id as `name`.
 */
export function TimezoneSelect({
  name = "timezone",
  value,
}: {
  name?: string;
  value?: string | null;
}) {
  const detected = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/New_York";
    }
  }, []);

  const initial = value || detected || "America/New_York";
  const [selected, setSelected] = useState(initial);

  // Ensure the current value is always an option even if it's not in the list.
  const options = ZONES.some((z) => z.id === selected)
    ? ZONES
    : [{ id: selected, label: selected }, ...ZONES];

  return (
    <select name={name} value={selected} onChange={(e) => setSelected(e.target.value)} className={inputClass}>
      {options.map((z) => (
        <option key={z.id} value={z.id}>
          {z.label}
        </option>
      ))}
    </select>
  );
}
