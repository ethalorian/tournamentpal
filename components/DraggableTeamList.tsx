"use client";

import { useRef, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { RemoveTeamButton } from "@/components/RemoveTeamButton";
import { Badge } from "@/components/ui";
import { reorderSeeds } from "@/app/director/actions";

export type SeedTeam = {
  id: string;
  name: string;
  managerId: string | null;
  levelName: string;
  levelColor: string;
};

/**
 * Drag-and-drop seed order. Rows reorder live as you drag (pointer events, so it
 * works with touch and mouse); on release the new order is saved and each team's
 * seed becomes its position. Seeds drive pooling and bracket matchups, so this is
 * the manual seeding control.
 */
export function DraggableTeamList({
  tournamentId,
  teams,
  showDivision,
  warnOnRemove,
}: {
  tournamentId: string;
  teams: SeedTeam[];
  showDivision: boolean;
  warnOnRemove: boolean;
}) {
  const [order, setOrder] = useState<SeedTeam[]>(teams);
  const [dragId, setDragId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const startOrder = useRef<string[]>([]);

  function beginDrag(e: React.PointerEvent, id: string) {
    setDragId(id);
    startOrder.current = order.map((t) => t.id);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    if (!dragId) return;
    const y = e.clientY;
    let targetId: string | null = null;
    for (const [id, el] of rowRefs.current) {
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) {
        targetId = id;
        break;
      }
    }
    if (!targetId || targetId === dragId) return;
    setOrder((prev) => {
      const from = prev.findIndex((t) => t.id === dragId);
      const to = prev.findIndex((t) => t.id === targetId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function endDrag() {
    if (!dragId) return;
    setDragId(null);
    const now = order.map((t) => t.id);
    if (now.join(",") !== startOrder.current.join(",")) {
      const fd = new FormData();
      fd.set("tournament_id", tournamentId);
      fd.set("order", now.join(","));
      void reorderSeeds(fd);
    }
  }

  return (
    <div className="flex flex-col gap-2" onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      {order.map((t, i) => (
        <div
          key={t.id}
          ref={(el) => {
            if (el) rowRefs.current.set(t.id, el);
            else rowRefs.current.delete(t.id);
          }}
          className={`rounded-xl border border-faint border-l-[5px] px-3 py-2.5 transition-shadow ${
            dragId === t.id ? "bg-haze shadow-[0_8px_24px_rgba(20,24,40,.14)]" : ""
          }`}
          style={{ borderLeftColor: t.levelColor }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                aria-label={`Drag ${t.name} to reorder`}
                onPointerDown={(e) => beginDrag(e, t.id)}
                className="shrink-0 cursor-grab select-none px-1 text-[15px] leading-none text-muted active:cursor-grabbing"
                style={{ touchAction: "none" }}
              >
                ⠿
              </button>
              <span className="display flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-haze text-[12px]">
                {i + 1}
              </span>
              <span className="truncate text-[14px] font-bold">{t.name}</span>
              {showDivision && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white"
                  style={{ backgroundColor: t.levelColor }}
                >
                  {t.levelName}
                </span>
              )}
              {t.managerId ? <Badge tone="success">Coach</Badge> : <Badge tone="muted">Unclaimed</Badge>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!t.managerId && <CopyButton path={`/claim/${t.id}`} />}
              <RemoveTeamButton
                teamId={t.id}
                tournamentId={tournamentId}
                teamName={t.name}
                warn={warnOnRemove}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
