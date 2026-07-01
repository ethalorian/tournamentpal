"use client";

import { useRouter } from "next/navigation";

export function ScheduleControls({
  id,
  view,
  team,
  teams,
}: {
  id: string;
  view: "games" | "bracket";
  team: string;
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();

  const go = (nextView: string, nextTeam: string) => {
    const params = new URLSearchParams();
    if (nextView === "bracket") params.set("view", "bracket");
    if (nextTeam) params.set("team", nextTeam);
    const qs = params.toString();
    router.push(`/t/${id}/schedule${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex rounded-full border border-faint p-0.5">
        {(["games", "bracket"] as const).map((v) => (
          <button
            key={v}
            onClick={() => go(v, team)}
            className={`display rounded-full px-4 py-1.5 text-[12px] tracking-wide ${
              view === v ? "bg-ink text-white" : "text-muted"
            }`}
          >
            {v === "games" ? "Games" : "Bracket"}
          </button>
        ))}
      </div>

      <select
        value={team}
        onChange={(e) => go(view, e.target.value)}
        className="rounded-full border border-faint bg-white px-3 py-2 text-[13px] font-semibold outline-none"
      >
        <option value="">All teams</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
