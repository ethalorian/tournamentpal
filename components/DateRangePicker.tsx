"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Single-entry tournament date range. Tap a start day, then an end day, on one
 * calendar. Emits hidden `start_date` / `end_date` inputs (YYYY-MM-DD) so it
 * drops into the existing server-action form unchanged.
 */

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function label(dstr: string | null) {
  if (!dstr) return "";
  const [y, m, d] = dstr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DateRangePicker({
  startName = "start_date",
  endName = "end_date",
  defaultStart = "",
  defaultEnd = "",
}: {
  startName?: string;
  endName?: string;
  defaultStart?: string;
  defaultEnd?: string;
}) {
  const [start, setStart] = useState<string>(defaultStart);
  const [end, setEnd] = useState<string>(defaultEnd);
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [view, setView] = useState({
    y: defaultStart ? Number(defaultStart.slice(0, 4)) : now.getFullYear(),
    m: defaultStart ? Number(defaultStart.slice(5, 7)) - 1 : now.getMonth(),
  });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(dstr: string) {
    if (!start || (start && end)) {
      setStart(dstr);
      setEnd("");
    } else if (dstr < start) {
      setStart(dstr);
    } else {
      setEnd(dstr);
      setOpen(false);
    }
  }

  const firstWeekday = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  }

  const display = start
    ? end
      ? `${label(start)} → ${label(end)}`
      : `${label(start)} → …`
    : "Select tournament dates";

  return (
    <div ref={wrapRef} className="relative">
      <input type="hidden" name={startName} value={start} />
      <input type="hidden" name={endName} value={end} />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full rounded-xl border border-faint bg-haze px-4 py-3 text-left text-[15px] outline-none focus:border-ink ${
          start ? "text-ink" : "text-muted"
        }`}
      >
        {display}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-faint bg-paper p-3 shadow-[0_18px_40px_rgba(20,24,40,.18)]">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} className="px-2 py-1 text-[15px] font-bold text-muted hover:text-ink">
              ‹
            </button>
            <span className="text-[13px] font-extrabold">
              {MONTHS[view.m]} {view.y}
            </span>
            <button type="button" onClick={() => shiftMonth(1)} className="px-2 py-1 text-[15px] font-bold text-muted hover:text-ink">
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((w, i) => (
              <span key={i} className="py-1 text-[10px] font-bold text-muted">
                {w}
              </span>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <span key={i} />;
              const dstr = iso(view.y, view.m, d);
              const isStart = dstr === start;
              const isEnd = dstr === end;
              const inRange = start && end && dstr > start && dstr < end;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(dstr)}
                  className={`h-9 rounded-lg text-[13px] font-bold ${
                    isStart || isEnd
                      ? "bg-ink text-white"
                      : inRange
                        ? "bg-accent/40 text-ink"
                        : "hover:bg-haze"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          {start && (
            <button
              type="button"
              onClick={() => {
                setStart("");
                setEnd("");
              }}
              className="mt-2 w-full text-center text-[11px] font-bold text-muted hover:text-danger"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
