"use client";

import { useRef, useState } from "react";
import { SaveButton } from "@/components/SaveButton";
import { saveRulesSummary } from "@/app/director/actions";

/**
 * Upload a (long) rules document — PDF, image, or .txt — and get a short
 * key-points summary from the Claude API. The director reviews/edits it and
 * saves; the summary is stored on the tournament and can be shown to followers.
 */
export function RulesSummarizer({
  tournamentId,
  initialSummary,
}: {
  tournamentId: string;
  initialSummary: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState(initialSummary);
  const [status, setStatus] = useState<"idle" | "reading" | "error">("idle");
  const [message, setMessage] = useState("");

  function pick() {
    inputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setStatus("reading");
    setMessage(`Reading “${file.name}”…`);

    try {
      let payload: Record<string, unknown>;
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        payload = { kind: "pdf", data: await toBase64(file) };
      } else if (file.type.startsWith("image/")) {
        payload = { kind: "image", data: await toBase64(file), media_type: file.type };
      } else if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) {
        payload = { kind: "text", text: await file.text() };
      } else {
        setStatus("error");
        setMessage("Please upload a PDF, an image, or a .txt file.");
        return;
      }

      const res = await fetch("/api/summarize-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error ?? "Couldn't summarize that document. Try again.");
        return;
      }
      if (!data.summary) {
        setStatus("error");
        setMessage("No rules could be read from that document.");
        return;
      }
      setSummary(data.summary);
      setStatus("idle");
      setMessage("Summary ready — review and edit, then save.");
    } catch {
      setStatus("error");
      setMessage("Something went wrong reading that file. Try again.");
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-faint p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="display text-[15px]">Rules document summary</div>
          <div className="text-[11px] text-muted">
            Upload your full rules (PDF, photo, or .txt) — we&rsquo;ll pull out the key points.
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
        accept="application/pdf,image/*,.txt,text/plain"
        className="hidden"
        onChange={onFile}
      />

      {message && (
        <div className={`mt-3 text-[11px] font-bold ${status === "error" ? "text-danger" : "text-muted"}`}>
          {message}
        </div>
      )}

      {(summary || status === "idle") && (
        <form action={saveRulesSummary} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="tournament_id" value={tournamentId} />
          <textarea
            name="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={10}
            placeholder="Upload a document above, or write the key rules here…"
            className="w-full min-w-0 rounded-xl border border-faint bg-haze px-4 py-3 text-[13px] leading-relaxed text-ink outline-none focus:border-ink placeholder:text-muted"
          />
          <SaveButton savedLabel="Summary saved ✓">Save rules summary</SaveButton>
        </form>
      )}
    </div>
  );
}

/** Read a file as base64 (no data: prefix). */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
