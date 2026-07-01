"use client";

import { useRef, useState } from "react";
import { addScannedTeams } from "@/app/director/actions";

/**
 * "Prefill from a screenshot" flow for the Teams step.
 *
 * The director uploads a screenshot of a registration/schedule page; we send it
 * to /api/scan-teams (Claude vision) and get back team names, each with a
 * division/age group when the page labels them. The results land in an editable
 * review list — team name + division — so the director can fix anything before
 * saving. Divisions fuzzy-match existing ones on save, creating new ones only
 * when there's no match. Several screenshots can be stacked (append + de-dupe)
 * for lists too long to fit in one shot.
 */

type Row = { key: string; name: string; division: string };
type ScannedTeam = { name: string; division: string };

export function ScanTeamsButton({
  tournamentId,
  divisions,
}: {
  tournamentId: string;
  divisions: { id: string; name: string }[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"idle" | "reading" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  function pick() {
    inputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setStatus("reading");
    setMessage("Reading the screenshot…");

    try {
      const image = await downscaleToBase64(file);
      const res = await fetch("/api/scan-teams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image, media_type: "image/jpeg" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error ?? "Couldn't read that image. Try again.");
        return;
      }

      const found: ScannedTeam[] = Array.isArray(data.teams) ? data.teams : [];
      if (found.length === 0) {
        setStatus("error");
        setMessage("No team names found in that screenshot.");
        return;
      }

      const added = mergeRows(found);
      setStatus("idle");
      const withDiv = found.filter((t) => t.division).length;
      setMessage(
        `Found ${found.length} ${found.length === 1 ? "team" : "teams"}` +
          (withDiv ? `, ${withDiv} with a division` : "") +
          (added < found.length ? ` (${found.length - added} already listed)` : "") +
          ". Review below, then add."
      );
    } catch {
      setStatus("error");
      setMessage("Something went wrong reading that image. Try again.");
    }
  }

  /** Append scanned teams, skipping names already in the list. Returns # added. */
  function mergeRows(found: ScannedTeam[]): number {
    let added = 0;
    setRows((prev) => {
      const seen = new Set(prev.map((r) => r.name.trim().toLowerCase()));
      const next = [...prev];
      for (const t of found) {
        const k = t.name.trim().toLowerCase();
        if (k && !seen.has(k)) {
          seen.add(k);
          next.push({
            key: `${Date.now()}-${next.length}-${k}`,
            name: t.name,
            division: t.division ?? "",
          });
          added++;
        }
      }
      return next;
    });
    return added;
  }

  function update(key: string, field: "name" | "division", value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  // Client action: submit the reviewed rows, then clear the list on success.
  async function save(formData: FormData) {
    setStatus("saving");
    try {
      await addScannedTeams(formData);
      const n = rows.filter((r) => r.name.trim()).length;
      setRows([]);
      setStatus("idle");
      setMessage(`Added ${n} ${n === 1 ? "team" : "teams"} ✓`);
    } catch {
      setStatus("error");
      setMessage("Couldn't save those teams. Try again.");
    }
  }

  const listId = `scan-divisions-${tournamentId}`;

  return (
    <div className="mt-3 rounded-xl border border-faint p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-bold">Prefill from a screenshot</div>
          <div className="text-[11px] text-muted">
            Snap the list — we&rsquo;ll read team names and their age group when shown.
          </div>
        </div>
        <button
          type="button"
          onClick={pick}
          disabled={status === "reading" || status === "saving"}
          className="display shrink-0 rounded-full border-2 border-ink px-3 py-1.5 text-[11px] tracking-wide active:scale-95 disabled:opacity-50"
        >
          {status === "reading" ? "Reading…" : rows.length ? "Add photo" : "Upload"}
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {message && (
        <div
          className={
            "mt-3 text-[11px] font-bold " +
            (status === "error" ? "text-danger" : rows.length ? "text-muted" : "text-success")
          }
        >
          {message}
        </div>
      )}

      {rows.length > 0 && (
        <form action={save} className="mt-3">
          <input type="hidden" name="tournament_id" value={tournamentId} />

          <datalist id={listId}>
            {divisions.map((d) => (
              <option key={d.id} value={d.name} />
            ))}
          </datalist>

          <div className="mb-1.5 flex gap-2 px-0.5">
            <span className="eyebrow flex-1">Team</span>
            <span className="eyebrow w-[38%]">Division</span>
            <span className="w-5" />
          </div>

          <div className="flex flex-col gap-1.5">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <input
                  name="name"
                  value={r.name}
                  onChange={(e) => update(r.key, "name", e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-faint bg-haze px-2.5 py-2 text-[13px] outline-none focus:border-ink"
                />
                <input
                  name="division"
                  value={r.division}
                  onChange={(e) => update(r.key, "division", e.target.value)}
                  list={listId}
                  placeholder="—"
                  className="w-[38%] rounded-lg border border-faint bg-haze px-2.5 py-2 text-[13px] outline-none focus:border-ink placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={() => remove(r.key)}
                  aria-label={`Remove ${r.name}`}
                  className="w-5 shrink-0 text-[15px] font-bold text-muted hover:text-danger"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={status === "saving"}
            className="btn-ink mt-3 flex h-11 w-full items-center justify-center rounded-xl text-[14px] disabled:opacity-50"
          >
            {status === "saving"
              ? "Adding…"
              : `Add ${rows.length} ${rows.length === 1 ? "team" : "teams"}`}
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * Downscale the chosen image to a max edge of 1568px and encode as JPEG base64.
 * Keeps uploads small and holds the vision cost near the ~1.6k-token minimum.
 */
function downscaleToBase64(file: File): Promise<string> {
  const MAX_EDGE = 1568;
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve(dataUrl.split(",")[1] ?? "");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}
