"use client";

import { useState } from "react";

/** Copies an app-relative path as an absolute URL to the clipboard. */
export function CopyButton({ path, label = "Copy invite" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback: select via prompt is overkill; just flag.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="display rounded-full border-2 border-ink px-3 py-1.5 text-[11px] tracking-wide active:scale-95"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
