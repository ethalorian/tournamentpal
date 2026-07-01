"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TournamentNav({ id }: { id: string }) {
  const pathname = usePathname();
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
    { href: `/director/${id}/rules`, label: "Rules" },
  ];
  return (
    <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`display whitespace-nowrap rounded-full px-4 py-2 text-[12px] tracking-wide ${
              active ? "bg-ink text-white" : "border border-faint text-muted"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
