import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { RulesEditor } from "@/components/RulesEditor";
import { RulesSummarizer } from "@/components/RulesSummarizer";
import { DEFAULT_RULES } from "@/lib/engine/standings";
import type { Rules } from "@/lib/engine/types";

export const dynamic = "force-dynamic";

export default async function RulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament } = await loadOwnedTournament(id);
  const rules = (tournament.rules ?? DEFAULT_RULES) as Rules;
  const documentSummary =
    ((tournament.rules ?? {}) as { documentSummary?: string }).documentSummary ?? "";

  return (
    <DirectorShell>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Rules &amp; tiebreakers</h1>
      <TournamentNav id={id} />

      <div className="mt-6">
        <RulesEditor
          tournamentId={id}
          initialOrder={rules.tiebreakers?.length ? rules.tiebreakers : DEFAULT_RULES.tiebreakers}
          initialRunRule={rules.runRule ?? DEFAULT_RULES.runRule}
          initialTimeLimit={rules.timeLimitMins ?? DEFAULT_RULES.timeLimitMins}
        />
      </div>

      <RulesSummarizer tournamentId={id} initialSummary={documentSummary} />
    </DirectorShell>
  );
}
