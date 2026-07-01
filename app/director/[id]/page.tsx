import Link from "next/link";
import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Badge, Eyebrow, Stat, Card, Button, EmptyState, inputClass } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { deleteTournament, announceToFollowers } from "@/app/director/actions";

export const dynamic = "force-dynamic";

const STATUS_TONE = { draft: "muted", published: "blue", live: "accent", completed: "muted" } as const;

export default async function TournamentOverview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ announced?: string }>;
}) {
  const { id } = await params;
  const { announced } = await searchParams;
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
          {/* Manual announce — texting is deliberate, never automatic. */}
          {announced && (
            <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-[13px] font-semibold text-success">
              Sent to followers.
            </p>
          )}
          <Card className="mt-4">
            <div className="display text-[15px]">Text your followers</div>
            <p className="mt-1 text-[12px] text-muted">
              Nothing goes out automatically — send an update only when you want to.
            </p>
            <form action={announceToFollowers} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="tournament_id" value={id} />
              <textarea
                name="body"
                rows={2}
                required
                className={`${inputClass} resize-none`}
                defaultValue="We're live! Follow your team for score alerts."
              />
              <Button type="submit" variant="ink" className="w-full">
                Send to followers
              </Button>
            </form>
          </Card>

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
        <div className="text-[12px] font-bold uppercase tracking-wide text-muted">Follower page</div>
        {isDraft ? (
          <p className="mt-2 text-[11px] text-muted">
            Drafts are private. Publish to open the public follower page and start alerts.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-[12px] text-muted">
              A public webpage anyone can open — share the link so families follow teams and get your alerts.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/t/${tournament.slug ?? id}`}
                className="btn-ink flex h-11 flex-1 items-center justify-center rounded-xl text-[13px]"
              >
                Open the page
              </Link>
              <CopyButton path={`/t/${tournament.slug ?? id}`} label="Copy link" />
            </div>
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
