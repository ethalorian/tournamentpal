"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function TournamentNav({ id }: { id: string }) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const tabs = [
    { href: `/director/${id}`, label: "Overview", exact: true },
    { href: `/director/${id}/teams`, label: "Teams" },
    { href: `/director/${id}/scores`, label: "Scores" },
    { href: `/director/${id}/standings`, label: "Standings" },
    { href: `/director/${id}/messages`, label: "Messages" },
    { href: `/director/${id}/concessions`, label: "Concessions" },
    { href: `/director/${id}/staff`, label: "Staff" },
    { href: `/director/${id}/sponsors`, label: "Sponsors" },
    { href: `/director/${id}/fields`, label: "Fields" },
    { href: `/director/${id}/scheduling`, label: "Scheduling" },
    { href: `/director/${id}/rules`, label: "Rules" },
  ];

  // Show an edge fade only on the side(s) that have more tabs to reveal.
  function updateFades() {
    const el = scrollRef.current;
    if (!el) return;
    setFadeLeft(el.scrollLeft > 1);
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  // On load / route change, center the active tab so the current page is
  // always visible and it's obvious there are tabs on either side.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-active="true"]');
    if (active) {
      const cRect = el.getBoundingClientRect();
      const aRect = active.getBoundingClientRect();
      el.scrollLeft += aRect.left - cRect.left - (el.clientWidth - aRect.width) / 2;
    }
    updateFades();
    window.addEventListener("resize", updateFades);
    return () => window.removeEventListener("resize", updateFades);
  }, [pathname]);

  return (
    <div className="relative -mx-5 mt-4">
      <div
        ref={scrollRef}
        onScroll={updateFades}
        className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-5"
      >
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              data-active={active}
              className={`display whitespace-nowrap rounded-full px-4 py-2 text-[12px] tracking-wide ${
                active ? "bg-ink text-white" : "border border-faint text-muted"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Edge fades — hint that the row scrolls, shown only when it can. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-paper to-transparent transition-opacity duration-200 ${
          fadeLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-paper to-transparent transition-opacity duration-200 ${
          fadeRight ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
