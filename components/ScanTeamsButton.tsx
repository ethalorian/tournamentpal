"use client";

import { useRef, useState } from "react";

/**
 * "Prefill from a screenshot" card for the Teams step.
 *
 * The director uploads a screenshot of a registration/schedule page; we send it
 * to /api/scan-teams (Claude vision) and drop the detected team names into the
 * existing "Team names" textarea for review. Names are appended and de-duped, so
 * a long list that needs several screenshots can be stacked one shot at a time.
 *
 * `targetId` is the id of the textarea to fill.
 */
export function ScanTeamsButton({ targetId }: { targetId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  function pick() {
    inputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
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

      const found: string[] = Array.isArray(data.teams) ? data.teams : [];
      if (found.length === 0) {
        setStatus("error");
        setMessage("No team names found in that screenshot.");
        return;
      }

      const added = appendToTextarea(targetId, found);
      setStatus("done");
      setMessage(
        added === found.length
          ? `Found ${added} ${added === 1 ? "team" : "teams"} — review below, then Add teams.`
          : `Added ${added} new (${found.length - added} already listed). Review below.`
      );
    } catch {
      setStatus("error");
      setMessage("Something went wrong reading that image. Try again.");
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-faint p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-bold">Prefill from a screenshot</div>
          <div className="text-[11px] text-muted">
            Snap the &ldquo;Who&rsquo;s Playing&rdquo; list — we&rsquo;ll read the team names in.
          </div>
        </div>
        <button
          type="button"
          onClick={pick}
          disabled={status === "reading"}
          className="display shrink-0 rounded-full border-2 border-ink px-3 py-1.5 text-[11px] tracking-wide active:scale-95 disabled:opacity-50"
        >
          {status === "reading" ? "Reading…" : "Upload"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />

      {message && (
        <div
          className={
            "mt-3 text-[11px] font-bold " +
            (status === "error"
              ? "text-danger"
              : status === "done"
                ? "text-success"
                : "text-muted")
          }
        >
          {message}
        </div>
      )}
    </div>
  );
}

/**
 * Append names to the target textarea, skipping any (case-insensitively)
 * already present. Returns how many were newly added. Works with the
 * uncontrolled server-rendered textarea by setting .value and firing an input
 * event so React/anything listening stays in sync.
 */
function appendToTextarea(targetId: string, names: string[]): number {
  const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
  if (!el) return 0;

  const existing = el.value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set(existing.map((s) => s.toLowerCase()));

  const fresh: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      fresh.push(name);
    }
  }
  if (fresh.length === 0) return 0;

  const merged = [...existing, ...fresh].join("\n");
  el.value = merged;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  el.scrollTop = el.scrollHeight;
  return fresh.length;
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
