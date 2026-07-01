"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";

const PRESETS = ["8U", "10U", "12U", "14U", "16U", "18U", "Open"];

function pill(active: boolean) {
  return `rounded-full border-2 px-4 py-2 text-[13px] font-bold transition active:scale-95 ${
    active ? "border-ink bg-ink text-white" : "border-faint text-ink"
  }`;
}

/**
 * Tappable age-division picker. Presets toggle on/off; custom divisions can be
 * added. Writes the selected list to a hidden input (comma-joined) so the
 * existing server action parses it unchanged.
 */
export function DivisionPicker({ name = "divisions" }: { name?: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  const toggle = (d: string) =>
    setSelected((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));

  const addCustom = () => {
    const v = custom.trim().replace(/,/g, "");
    if (v && !selected.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setSelected((s) => [...s, v]);
    }
    setCustom("");
  };

  const customSelected = selected.filter((d) => !PRESETS.includes(d));

  return (
    <div>
      <input type="hidden" name={name} value={selected.join(",")} />

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((d) => (
          <button type="button" key={d} onClick={() => toggle(d)} className={pill(selected.includes(d))}>
            {d}
          </button>
        ))}
        {customSelected.map((d) => (
          <button type="button" key={d} onClick={() => toggle(d)} className={pill(true)}>
            {d} <span className="opacity-60">✕</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add a custom division (e.g. 14U Gold)"
          className={inputClass}
        />
        <button
          type="button"
          onClick={addCustom}
          className="btn-ink flex h-[46px] shrink-0 items-center rounded-xl px-4 text-[13px]"
        >
          Add
        </button>
      </div>

      <p className="mt-1.5 text-[11px] text-muted">
        {selected.length > 0
          ? `${selected.length} division${selected.length > 1 ? "s" : ""} selected.`
          : "Optional — leave blank for a single open division."}
      </p>
    </div>
  );
}
