"use client";

import { useRouter } from "next/navigation";

/**
 * A universal "go back" control. Uses browser history when there is any,
 * otherwise falls back to a sensible parent route so users are never stuck.
 */
export function BackButton({
  label = "Back",
  fallback = "/",
}: {
  label?: string;
  fallback?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted"
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M12 4 L6 10 L12 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}
