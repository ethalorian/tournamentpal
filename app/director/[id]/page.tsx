import Link from "next/link";
import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Badge, Eyebrow, Stat, Card, Button, EmptyState } from "@/components/ui";
import { deleteTournament } from "@/app/director/actions";

export const dynamic = "force-dynamic";

const STATUS_TONE = { draft: "muted", published: "blue", live: "accent", completed: "muted" } as const;

export default async function TournamentOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament, supabase } = await loadOwnedTournament(id);

  const [{ data: teams }, { data: games }] = await Promise.all([
    supabase.from("teams").select("id,name").eq("tournament_id", id),
    supabase.from("games").select("*").eq("tournament_id", id).order("scheduled_at"),
  ]);
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const gameList = games ?? [];
  const toPost = gameList.filter((g) => g.status === "scheduled" && g.home_team_id).length;
  const nextGame = gameList.find((g) => g.status === "scheduled" && g.home_team_id);
  const isDraft = tournament.status === "draft";

  return (
    <DirectorShell>
      <BackLink href="/director" />
      <div className="mt-3 flex items-start justify-between">
        <div>
          <Eyebrow>{tournament.sport}</Eyebrow>
          <h1 className="display mt-1.5 text-[26px]">{tournament.name}</h1>
          <div className="mt-1 text-[12px] font-medium text-muted">
            {tournament.location ?? "Location TBD"}
          </div>
        </div>
        <Badge tone={STATUS_TONE[tournament.status as keyof typeof STATUS_TONE] ?? "muted"}>
          {tournament.status}
        </Badge>
      </div>

      <TournamentNav id={id} />

      <div className="mt-5 flex gap-6 rounded-2xl border-2 border-ink p-4">
        <Stat value={teams?.length ?? 0} label="Teams" />
        <Stat value={gameList.length} label="Games" />
        <Stat value={toPost} label="To post" accent="blue" />
      </div>

      {isDraft ? (
        <Card className="mt-4">
          <div className="display text-[15px]">Finish setup</div>
          <p className="mt-1 text-[12px] text-muted">
            This event is still a draft. Generate &amp; publish to make it public
            and open scoring.
          </p>
          <Link
            href={`/director/${id}/review`}
            className="btn-ink mt-3 flex h-12 items-center justify-center rounded-xl text-[14px]"
          >
            Go to review &amp; publish
          </Link>
        </Card>
      ) : (
        <>
          <Link
            href={`/director/${id}/hold`}
            className={`mt-4 flex items-center justify-between rounded-2xl p-4 ${
              tournament.hold_status ? "border-2 border-danger bg-danger/10" : "border border-faint"
            }`}
          >
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Weather &amp; play</div>
              <div className="display mt-1 text-[15px]">
                {tournament.hold_status ? tournament.hold_status : "Running normally"}
              </div>
            </div>
            {tournament.hold_status ? <Badge tone="danger">Resume</Badge> : <Badge tone="muted">Manage</Badge>}
          </Link>

          <Eyebrow className="mt-6 mb-3">Up next</Eyebrow>
          {nextGame ? (
            <Link
              href={`/director/${id}/scores/${nextGame.id}`}
              className="block rounded-2xl border-2 border-ink p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
                  {nextGame.bracket_slot ?? "Pool play"}
                </span>
                <span className="text-[11px] font-semibold text-muted">
                  {nextGame.scheduled_at
                    ? new Date(nextGame.scheduled_at).toLocaleString("en-US", {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "TBD"}
                </span>
              </div>
              <div className="display mt-3 text-[22px]">
                {teamName.get(nextGame.home_team_id ?? "") ?? "TBD"}
              </div>
              <div className="my-1 text-[12px] font-bold text-muted">vs</div>
              <div className="display text-[22px]">
                {teamName.get(nextGame.away_team_id ?? "") ?? "TBD"}
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-blue">
                Post this score →
              </div>
            </Link>
          ) : (
            <EmptyState title="All caught up" body="No games waiting on a score." />
          )}
        </>
      )}

      {/* Share + danger */}
      <Card className="mt-6">
        <div className="text-[12px] font-bold uppercase tracking-wide text-muted">Follower link</div>
        <div className="mt-2 truncate rounded-lg bg-haze px-3 py-2 font-mono text-[12px]">/t/{id}</div>
        {isDraft ? (
          <p className="mt-2 text-[11px] text-muted">
            Drafts are private. Publish to open the public follower page and start alerts.
          </p>
        ) : (
          <>
            <Link
              href={`/t/${id}`}
              className="btn-ink mt-3 flex h-11 items-center justify-center rounded-xl text-[13px]"
            >
              Open public follower page
            </Link>
            <p className="mt-1.5 text-[11px] text-muted">
              Share this so families can follow teams and get score alerts.
            </p>
          </>
        )}
      </Card>

      <form action={deleteTournament} className="mt-4">
        <input type="hidden" name="tournament_id" value={id} />
        <Button type="submit" variant="ghost" className="w-full text-danger">
          Delete tournament
        </Button>
      </form>
    </DirectorShell>
  );
}
