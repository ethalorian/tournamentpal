import Link from "next/link";
import { loadScoreable } from "@/lib/staff";
import { ScoreShell } from "@/components/ScoreShell";
import { BackLink } from "@/components/DirectorShell";
import { Eyebrow, Badge, EmptyState } from "@/components/ui";
import { gameTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ScoreQueue({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ posted?: string }>;
}) {
  const { id } = await params;
  const { posted } = await searchParams;
  const { supabase, tournament } = await loadScoreable(id);

  const [{ data: teams }, { data: games }] = await Promise.all([
    supabase.from("teams").select("id,name").eq("tournament_id", id),
    supabase.from("games").select("*").eq("tournament_id", id).order("scheduled_at"),
  ]);
  const nm = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const name = (t: string | null) => (t ? nm.get(t) ?? "TBD" : "TBD");
  const all = games ?? [];
  const needs = all.filter((g) => g.status === "scheduled" && g.home_team_id && g.away_team_id);
  const done = all.filter((g) => g.status === "final");

  return (
    <ScoreShell>
      <BackLink href="/score" label="Events" />
      <h1 className="display mt-3 text-[24px]">{tournament.name}</h1>
      <p className="mt-1 text-[12px] text-muted">Post finals — followers get notified.</p>

      {posted && (
        <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-[13px] font-semibold text-success">
          Score posted.
        </p>
      )}

      <Eyebrow className="mb-3 mt-6">Needs a final · {needs.length}</Eyebrow>
      {needs.length === 0 ? (
        <EmptyState title="Nothing to post" body="Every scheduled game has a result." />
      ) : (
        <div className="flex flex-col gap-2">
          {needs.map((g) => (
            <Link
              key={g.id}
              href={`/score/${id}/${g.id}`}
              className="flex items-center justify-between rounded-2xl border-2 border-ink px-4 py-3"
            >
              <div>
                <div className="text-[14px] font-extrabold">
                  {name(g.home_team_id)} <span className="text-muted">vs</span> {name(g.away_team_id)}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-muted">
                  {g.bracket_slot ?? "Pool"} · {gameTime(g.scheduled_at)}
                </div>
              </div>
              <Badge tone="blue">Post</Badge>
            </Link>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <Eyebrow className="mb-3 mt-7">Recently posted</Eyebrow>
          <div className="flex flex-col gap-2">
            {done.slice(-10).reverse().map((g) => (
              <Link key={g.id} href={`/score/${id}/${g.id}`} className="flex items-center justify-between rounded-xl border border-faint px-4 py-3">
                <div className="text-[13px] font-bold">
                  {name(g.home_team_id)} {g.home_score} · {name(g.away_team_id)} {g.away_score}
                </div>
                <span className="text-[11px] font-bold text-muted">Edit</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </ScoreShell>
  );
}
