"use client";

import { useRef, useState } from "react";
import { addScannedConcessions } from "@/app/director/concessions";

/**
 * "Scan a menu photo" flow for the Concessions screen. The director photographs
 * their menu board; /api/scan-concessions (Claude vision) returns item names and
 * prices, which land in an editable review list before saving to the tournament.
 * Multiple photos stack (append + de-dupe by name).
 */

type Row = { key: string; name: string; price: string };
type MenuItem = { name: string; price: number | null };

export function ScanConcessionsButton({ tournamentId }: { tournamentId: string }) {
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
    setMessage("Reading the menu…");
    try {
      const image = await downscaleToBase64(file);
      const res = await fetch("/api/scan-concessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image, media_type: "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error ?? "Couldn't read that photo. Try again.");
        return;
      }
      const found: MenuItem[] = Array.isArray(data.items) ? data.items : [];
      if (found.length === 0) {
        setStatus("error");
        setMessage("No menu items found in that photo.");
        return;
      }
      const added = merge(found);
      setStatus("idle");
      setMessage(
        `Found ${found.length} item${found.length === 1 ? "" : "s"}` +
          (added < found.length ? ` (${found.length - added} already listed)` : "") +
          ". Review below, then add."
      );
    } catch {
      setStatus("error");
      setMessage("Something went wrong reading that photo. Try again.");
    }
  }

  function merge(found: MenuItem[]): number {
    let added = 0;
    setRows((prev) => {
      const seen = new Set(prev.map((r) => r.name.trim().toLowerCase()));
      const next = [...prev];
      for (const it of found) {
        const k = it.name.trim().toLowerCase();
        if (k && !seen.has(k)) {
          seen.add(k);
          next.push({
            key: `${Date.now()}-${next.length}-${k}`,
            name: it.name,
            price: it.price != null ? String(it.price) : "",
          });
          added++;
        }
      }
      return next;
    });
    return added;
  }

  function update(key: string, field: "name" | "price", value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function save(formData: FormData) {
    setStatus("saving");
    try {
      await addScannedConcessions(formData);
      const n = rows.filter((r) => r.name.trim()).length;
      setRows([]);
      setStatus("idle");
      setMessage(`Added ${n} item${n === 1 ? "" : "s"} ✓`);
    } catch {
      setStatus("error");
      setMessage("Couldn't save those items. Try again.");
    }
  }

  return (
    <div className="rounded-2xl p-4 border border-faint">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="display text-[15px]">Scan a menu photo</div>
          <div className="text-[11px] text-muted">Snap your menu board — we&rsquo;ll read items &amp; prices.</div>
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
          <div className="mb-1.5 flex gap-2 px-0.5">
            <span className="eyebrow flex-1">Item</span>
            <span className="eyebrow w-20">Price $</span>
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
                  name="price"
                  value={r.price}
                  onChange={(e) => update(r.key, "price", e.target.value)}
                  inputMode="decimal"
                  placeholder="—"
                  className="w-20 rounded-lg border border-faint bg-haze px-2.5 py-2 text-[13px] outline-none focus:border-ink placeholder:text-muted"
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
            {status === "saving" ? "Adding…" : `Add ${rows.length} item${rows.length === 1 ? "" : "s"}`}
          </button>
        </form>
      )}
    </div>
  );
}

/** Downscale to a 1568px max edge and encode as JPEG base64 to keep cost low. */
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
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}
