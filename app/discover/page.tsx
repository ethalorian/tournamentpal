import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, Badge, EmptyState, inputClass } from "@/components/ui";
import { dateRange } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_TONE = { published: "blue", live: "accent", completed: "muted" } as const;

export default async function Discover({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sport?: string }>;
}) {
  const { q, sport } = await searchParams;
  const supabase = await createClient();

  // RLS returns only published/live/completed tournaments to anonymous visitors.
  let query = supabase
    .from("tournaments")
    .select("id,slug,name,location,sport,start_date,end_date,status")
    .order("start_date", { ascending: false })
    .limit(60);
  if (q && q.trim()) query = query.or(`name.ilike.%${q.trim()}%,location.ilike.%${q.trim()}%`);
  if (sport === "baseball" || sport === "softball") query = query.eq("sport", sport);

  const { data: events } = await query;
  const list = events ?? [];

  return (
    <div className="app-shell flex min-h-[100dvh] flex-col">
      <header className="flex items-center justify-between bg-ink px-5 py-3.5 text-white md:px-9 md:py-4">
        <Link href="/" className="display text-[15px] tracking-[1.5px] md:text-[18px]">
          TOURNAMENTPAL
        </Link>
        <Link href="/login" className="rounded-lg border border-white/30 px-3 py-1.5 text-[12px] font-semibold">
          Sign in
        </Link>
      </header>

      <div className="flex-1 px-5 pb-10 pt-6 md:px-9">
        <Eyebrow>Followers · free</Eyebrow>
        <h1 className="display mt-1.5 text-[28px]">Find an event</h1>
        <p className="mt-1 text-[13px] text-muted">
          Browse live and upcoming tournaments, then follow your team for score alerts.
        </p>

        <form className="mt-5 flex flex-col gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            className={inputClass}
            placeholder="Search by name or city…"
          />
          <div className="flex gap-2">
            {[
              { v: "", label: "All" },
              { v: "softball", label: "Softball" },
              { v: "baseball", label: "Baseball" },
            ].map((s) => (
              <button
                key={s.label}
                name="sport"
                value={s.v}
                className={`rounded-full border-2 px-3 py-1.5 text-[12px] font-bold ${
                  (sport ?? "") === s.v ? "border-ink bg-ink text-white" : "border-faint"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </form>

        <Eyebrow className="mb-3 mt-7">{list.length} event{list.length === 1 ? "" : "s"}</Eyebrow>
        {list.length === 0 ? (
          <EmptyState title="Nothing found" body="Try a different name or city, or ask your director for the link." />
        ) : (
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
            {list.map((t) => (
              <Link key={t.id} href={`/t/${t.slug ?? t.id}`} className="block rounded-2xl border border-faint p-4">
                <div className="flex items-start justify-between">
                  <div className="font-extrabold text-[16px]">{t.name}</div>
                  <Badge tone={STATUS_TONE[t.status as keyof typeof STATUS_TONE] ?? "muted"}>{t.status}</Badge>
                </div>
                <div className="mt-1 text-[12px] font-medium text-muted">
                  {dateRange(t.start_date, t.end_date)}
                  {t.location ? ` · ${t.location}` : ""} · {t.sport}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
