import Link from "next/link";
import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Eyebrow, Badge, EmptyState } from "@/components/ui";
import { gameTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ScoresPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ posted?: string }>;
}) {
  const { id } = await params;
  const { posted } = await searchParams;
  const { tournament, supabase } = await loadOwnedTournament(id);

  const [{ data: teams }, { data: games }] = await Promise.all([
    supabase.from("teams").select("id,name").eq("tournament_id", id),
    supabase.from("games").select("*").eq("tournament_id", id).order("scheduled_at"),
  ]);
  const nm = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const name = (tid: string | null) => (tid ? nm.get(tid) ?? "TBD" : "TBD");

  const all = games ?? [];
  const needsScore = all.filter((g) => g.status === "scheduled" && g.home_team_id && g.away_team_id);
  const posted_ = all.filter((g) => g.status === "final");

  return (
    <DirectorShell>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Post scores</h1>
      <TournamentNav id={id} />

      {posted && (
        <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-[13px] font-semibold text-success">
          Score posted. Standings updated.
        </p>
      )}

      <Eyebrow className="mt-6 mb-3">
        Needs a final · {needsScore.length}
      </Eyebrow>
      {needsScore.length === 0 ? (
        <EmptyState title="Nothing to post" body="Every scheduled game has a result." />
      ) : (
        <div className="flex flex-col gap-2">
          {needsScore.map((g) => (
            <Link
              key={g.id}
              href={`/director/${id}/scores/${g.id}`}
              className="flex items-center justify-between rounded-2xl border-2 border-ink px-4 py-3"
            >
              <div>
                <div className="text-[14px] font-extrabold">
                  {name(g.home_team_id)} <span className="text-muted">vs</span> {name(g.away_team_id)}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-muted">
                  {g.bracket_slot ?? "Pool"} · {gameTime(g.scheduled_at, tournament.timezone)}
                </div>
              </div>
              <Badge tone="blue">Post</Badge>
            </Link>
          ))}
        </div>
      )}

      {posted_.length > 0 && (
        <>
          <Eyebrow className="mt-7 mb-3">Recently posted</Eyebrow>
          <div className="flex flex-col gap-2">
            {posted_.slice(0, 12).map((g) => (
              <Link
                key={g.id}
                href={`/director/${id}/scores/${g.id}`}
                className="flex items-center justify-between rounded-xl border border-faint px-4 py-3"
              >
                <div className="text-[13px] font-bold">
                  {name(g.home_team_id)} {g.home_score} <span className="text-muted">·</span>{" "}
                  {name(g.away_team_id)} {g.away_score}
                </div>
                <span className="text-[11px] font-bold text-muted">Edit</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {tournament.status === "draft" && (
        <p className="mt-6 text-[12px] text-muted">
          This event is a draft.{" "}
          <Link href={`/director/${id}/review`} className="font-bold text-ink">
            Publish it
          </Link>{" "}
          to start posting.
        </p>
      )}
    </DirectorShell>
  );
}
