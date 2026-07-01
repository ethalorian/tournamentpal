import { notFound } from "next/navigation";
import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { Eyebrow, Badge } from "@/components/ui";
import { ScoreEntry } from "@/components/ScoreEntry";

export const dynamic = "force-dynamic";

export default async function EnterScorePage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;
  const { supabase } = await loadOwnedTournament(id);

  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .eq("tournament_id", id)
    .single();
  if (!game) notFound();

  const ids = [game.home_team_id, game.away_team_id].filter(Boolean) as string[];
  const { data: teams } = await supabase.from("teams").select("id,name").in("id", ids);
  const nm = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const homeName = nm.get(game.home_team_id ?? "") ?? "Home";
  const awayName = nm.get(game.away_team_id ?? "") ?? "Away";
  const isCorrection = game.status === "final";

  return (
    <DirectorShell showTabs={false}>
      <BackLink href={`/director/${id}/scores`} label="Scores" />
      <div className="mt-3 flex items-center justify-between">
        <Eyebrow>{game.bracket_slot ?? "Pool play"}</Eyebrow>
        {isCorrection && <Badge tone="muted">Editing final</Badge>}
      </div>
      <h1 className="display mt-1.5 text-[24px]">
        {isCorrection ? "Correct the score" : "Enter score"}
      </h1>
      <p className="mt-1.5 text-[13px] text-muted">
        Tap to set the runs, then post. {isCorrection ? "Saving updates standings and the bracket." : "This records the final and updates standings — followers aren't texted automatically."}
      </p>

      <ScoreEntry
        tournamentId={id}
        gameId={gameId}
        homeName={homeName}
        awayName={awayName}
        homeStart={game.home_score ?? 0}
        awayStart={game.away_score ?? 0}
        isCorrection={isCorrection}
      />
    </DirectorShell>
  );
}
