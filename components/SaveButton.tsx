"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Submit button that confirms a save happened. While the server action runs it
 * shows a spinner; when it finishes it flashes an animated "Saved ✓" so the
 * director knows the rule was logged. Must be rendered inside a <form>.
 */
export function SaveButton({
  children,
  className = "",
  savedLabel = "Saved ✓",
}: {
  children: ReactNode;
  className?: string;
  savedLabel?: string;
}) {
  const { pending } = useFormStatus();
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 1800);
      wasPending.current = pending;
      return () => clearTimeout(t);
    }
    wasPending.current = pending;
  }, [pending]);

  const base =
    "btn-ink flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] transition-colors disabled:opacity-70";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-live="polite"
      className={`${base} ${justSaved ? "!bg-success" : ""} ${className}`}
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          Saving…
        </>
      ) : justSaved ? (
        <span className="animate-pop-check">{savedLabel}</span>
      ) : (
        children
      )}
    </button>
  );
}
