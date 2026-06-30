"use client";

import { useState } from "react";
import { saveRules } from "@/app/director/actions";
import { Button, Field, inputClass } from "@/components/ui";
import type { TiebreakerKey } from "@/lib/engine/types";

const LABELS: Record<TiebreakerKey, string> = {
  headToHead: "Head-to-head",
  runDiff: "Run differential",
  runsAllowed: "Fewest runs allowed",
  runsScored: "Most runs scored",
  coinFlip: "Coin flip",
};

export function RulesEditor({
  tournamentId,
  initialOrder,
  initialRunRule,
  initialTimeLimit,
}: {
  tournamentId: string;
  initialOrder: TiebreakerKey[];
  initialRunRule: number;
  initialTimeLimit: number;
}) {
  const [order, setOrder] = useState<TiebreakerKey[]>(initialOrder);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  }

  return (
    <form action={saveRules} className="flex flex-col gap-5">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="tiebreaker_order" value={order.join(",")} />

      <div>
        <div className="eyebrow mb-2">Tiebreaker priority</div>
        <p className="mb-3 text-[12px] text-muted">
          Applied top to bottom when teams finish level on win percentage.
        </p>
        <div className="flex flex-col gap-2">
          {order.map((key, i) => (
            <div key={key} className="flex items-center justify-between rounded-xl border-2 border-ink px-3.5 py-2.5">
              <div className="flex items-center gap-3">
                <span className="display flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[13px]">
                  {i + 1}
                </span>
                <span className="text-[14px] font-bold">{LABELS[key]}</span>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="flex h-8 w-8 items-center justify-center rounded-full border border-faint text-[16px] disabled:opacity-30" aria-label="Move up">
                  ↑
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full border border-faint text-[16px] disabled:opacity-30" aria-label="Move down">
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Run rule (margin)" hint="0 = off">
          <input name="run_rule" type="number" inputMode="numeric" defaultValue={initialRunRule} className={inputClass} />
        </Field>
        <Field label="Time limit (min)" hint="Pool games. 0 = none">
          <input name="time_limit" type="number" inputMode="numeric" defaultValue={initialTimeLimit} className={inputClass} />
        </Field>
      </div>

      <Button type="submit" className="w-full">
        Save rules
      </Button>
    </form>
  );
}
