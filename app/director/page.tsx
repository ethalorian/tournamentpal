import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DirectorShell, Avatar } from "@/components/DirectorShell";
import { Badge, Eyebrow, Stat, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

function initials(name?: string | null) {
  if (!name) return "PD";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "PD";
}

const STATUS_TONE = {
  draft: "muted",
  published: "blue",
  live: "accent",
  completed: "muted",
} as const;

export default async function DirectorHome() {
  const { profile, supabase, user } = await requireUser();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .eq("director_id", user.id)
    .order("created_at", { ascending: false });

  const list = tournaments ?? [];

  // Per-event counts (small N — fine to fan out).
  const counts = await Promise.all(
    list.map(async (t) => {
      const [teams, games, toPost] = await Promise.all([
        supabase.from("teams").select("*", { count: "exact", head: true }).eq("tournament_id", t.id),
        supabase.from("games").select("*", { count: "exact", head: true }).eq("tournament_id", t.id),
        supabase
          .from("games")
          .select("*", { count: "exact", head: true })
          .eq("tournament_id", t.id)
          .eq("status", "scheduled")
          .not("home_team_id", "is", null),
      ]);
      return { id: t.id, teams: teams.count ?? 0, games: games.count ?? 0, toPost: toPost.count ?? 0 };
    })
  );
  const countMap = new Map(counts.map((c) => [c.id, c]));

  const active = list.filter((t) => t.status !== "completed");
  const past = list.filter((t) => t.status === "completed");

  return (
    <DirectorShell>
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>Director</Eyebrow>
          <h1 className="display mt-1.5 text-[28px]">Your events</h1>
        </div>
        <Avatar initials={initials(profile?.full_name)} />
      </div>

      <Link
        href="/director/new"
        className="btn-accent mt-5 flex h-[54px] items-center justify-center gap-2 rounded-2xl text-[17px]"
      >
        <span className="text-[22px] leading-none">+</span> New tournament
      </Link>

      <Link
        href="/director/facilities"
        className="mt-2.5 flex h-11 items-center justify-center gap-2 rounded-2xl border-2 border-ink text-[14px] font-bold"
      >
        Manage facilities
      </Link>

      {/* Active */}
      <Eyebrow className="mt-7 mb-3">Active</Eyebrow>
      {active.length === 0 ? (
        <EmptyState title="No active events" body="Spin up your first tournament from a preset." />
      ) : (
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
          {active.map((t) => {
            const c = countMap.get(t.id);
            return (
              <Link key={t.id} href={`/director/${t.id}`} className="block rounded-2xl border-2 border-ink p-4">
                <div className="flex items-start justify-between">
                  <div className="font-extrabold text-[16px]">{t.name}</div>
                  <Badge tone={STATUS_TONE[t.status as keyof typeof STATUS_TONE] ?? "muted"}>
                    {t.status}
                  </Badge>
                </div>
                <div className="mt-1.5 text-[12px] font-medium text-muted">
                  {formatDates(t.start_date, t.end_date)}
                  {t.location ? ` · ${t.location}` : ""}
                </div>
                <div className="mt-3.5 flex gap-5">
                  <Stat value={c?.teams ?? 0} label="Teams" />
                  <Stat value={c?.games ?? 0} label="Games" />
                  <Stat value={c?.toPost ?? 0} label="To post" accent="blue" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <>
          <Eyebrow className="mt-6 mb-3">Past</Eyebrow>
          <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2">
            {past.map((t) => (
              <Link
                key={t.id}
                href={`/director/${t.id}`}
                className="flex items-center justify-between rounded-2xl border border-faint px-4 py-3"
              >
                <div>
                  <div className="font-extrabold text-[14px]">{t.name}</div>
                  <div className="mt-0.5 text-[11px] font-medium text-muted">
                    {formatDates(t.start_date, t.end_date)}
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted">
                  Completed
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </DirectorShell>
  );
}

function formatDates(start: string | null, end: string | null) {
  if (!start) return "Dates TBD";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en-US", opts);
  if (!end || end === start) return s;
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en-US", opts);
  return `${s}–${e}`;
}
