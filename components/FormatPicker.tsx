"use client";

import { useMemo, useState } from "react";
import { buildPools, roundRobin } from "@/lib/engine/schedule";
import { powerOfTwoCeil } from "@/lib/engine/presets";
import type { FormatPreset } from "@/lib/engine/types";
import { setFormat } from "@/app/director/actions";
import { Button } from "@/components/ui";

function comb2(n: number) {
  return (n * (n - 1)) / 2;
}

export function FormatPicker({
  presets,
  teamCount,
  suggestedId,
  tournamentId,
  initialId,
}: {
  presets: FormatPreset[];
  teamCount: number;
  suggestedId: string;
  tournamentId: string;
  initialId?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialId || suggestedId);
  const selected = presets.find((p) => p.id === selectedId) ?? presets[0];

  const [poolSize, setPoolSize] = useState(selected.pool?.size ?? 4);
  const [bracketTeams, setBracketTeams] = useState(selected.bracketTeams);

  function choose(p: FormatPreset) {
    setSelectedId(p.id);
    setPoolSize(p.pool?.size ?? 4);
    setBracketTeams(p.bracketTeams);
  }

  // Accurate live estimate using the real engine.
  const estimate = useMemo(() => {
    const ids = Array.from({ length: teamCount }, (_, i) => ({ id: `t${i}`, name: "", seed: i + 1 }));
    let pool = 0;
    let bracket = 0;
    if (selected.pool) {
      const pools = buildPools(ids, poolSize);
      for (const p of pools) pool += comb2(p.teams.length);
      if (bracketTeams > 0) bracket = powerOfTwoCeil(bracketTeams) - 1;
    } else {
      bracket = powerOfTwoCeil(teamCount) - 1;
    }
    return { pool, bracket, total: pool + bracket, pools: selected.pool ? buildPools(ids, poolSize).length : 0 };
  }, [selected, poolSize, bracketTeams, teamCount]);

  return (
    <form action={setFormat} className="flex flex-col gap-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="preset_id" value={selectedId} />
      <input type="hidden" name="pool_size" value={selected.pool ? poolSize : 0} />
      <input type="hidden" name="bracket_teams" value={bracketTeams} />

      <div className="flex flex-col gap-2.5">
        {presets.map((p) => {
          const active = p.id === selectedId;
          const fits = teamCount >= p.minTeams && teamCount <= p.maxTeams;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => choose(p)}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                active ? "border-ink bg-ink text-white" : "border-faint"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[15px]">{p.name}</span>
                {p.id === suggestedId && (
                  <span className={`display rounded-md px-1.5 py-1 text-[9px] ${active ? "bg-accent text-ink" : "bg-accent text-ink"}`}>
                    Suggested
                  </span>
                )}
              </div>
              <p className={`mt-1 text-[12px] ${active ? "text-white/70" : "text-muted"}`}>{p.blurb}</p>
              {!fits && (
                <p className="mt-1 text-[11px] font-semibold text-danger">
                  Best for {p.minTeams}–{p.maxTeams} teams.
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Customize */}
      {selected.pool && (
        <Customizer label="Teams per pool" value={poolSize} setValue={setPoolSize} min={3} max={6} />
      )}
      {selected.pool && (
        <Customizer
          label="Teams into bracket"
          value={bracketTeams}
          setValue={setBracketTeams}
          min={0}
          max={Math.min(16, teamCount)}
          step={selected.bracketTeams ? 2 : 1}
          hint="0 = pool play only, best record wins."
        />
      )}

      {/* Live summary */}
      <div className="rounded-2xl border border-faint bg-haze p-4">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Live summary</div>
        <div className="mt-3 flex gap-6">
          <Sum value={teamCount} label="Teams" />
          {estimate.pools > 0 && <Sum value={estimate.pools} label="Pools" />}
          <Sum value={estimate.pool} label="Pool games" />
          <Sum value={estimate.bracket} label="Bracket" />
          <Sum value={estimate.total} label="Total" />
        </div>
      </div>

      <Button type="submit" className="mt-1 w-full">
        Review &amp; publish →
      </Button>
    </form>
  );
}

function Customizer({
  label,
  value,
  setValue,
  min,
  max,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-faint p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-bold">{label}</div>
          {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
        </div>
        <div className="flex items-center gap-3">
          <Stepbtn onClick={() => setValue(Math.max(min, value - step))}>−</Stepbtn>
          <span className="display w-7 text-center text-[20px]">{value}</span>
          <Stepbtn onClick={() => setValue(Math.min(max, value + step))}>+</Stepbtn>
        </div>
      </div>
    </div>
  );
}

function Stepbtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink text-[18px] font-bold active:scale-95"
    >
      {children}
    </button>
  );
}

function Sum({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="display text-[20px]">{value}</div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}
