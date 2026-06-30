import type { Tables } from "@/lib/database.types";

/** "DAY 2" while the event is running, else a status-friendly label. */
export function dayLabel(t: Pick<Tables<"tournaments">, "start_date" | "end_date" | "status">): string {
  if (t.status === "completed") return "FINAL";
  if (!t.start_date) return t.status.toUpperCase();
  const start = new Date(`${t.start_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  if (diff < 0) return "UPCOMING";
  const end = t.end_date ? new Date(`${t.end_date}T00:00:00`) : start;
  const span = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  if (diff > span) return "FINAL";
  return `DAY ${diff + 1}`;
}

/** Short time like "9:00 AM", or "TBD". */
export function gameTime(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Sat 9:00 AM". */
export function gameDayTime(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Jun 28–29" or "Jun 28". */
export function dateRange(start: string | null, end: string | null): string {
  if (!start) return "Dates TBD";
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en-US", o);
  if (!end || end === start) return s;
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en-US", o);
  return `${s}–${e}`;
}
