import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { Stepper } from "@/components/Stepper";
import { FormatPicker } from "@/components/FormatPicker";
import { FORMAT_PRESETS, suggestPreset } from "@/lib/engine/presets";

export const dynamic = "force-dynamic";

export default async function FormatStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament, supabase } = await loadOwnedTournament(id);

  const { count } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);
  const teamCount = count ?? 0;

  const suggested = suggestPreset(teamCount);
  const currentFormat = (tournament.format ?? {}) as { presetId?: string };

  return (
    <DirectorShell showTabs={false}>
      <BackLink href={`/director/${id}/fields?setup=1`} label="Fields" />
      <div className="mt-4">
        <Stepper step={4} total={5} label="Format" />
      </div>

      <h1 className="display mt-5 text-[26px]">Pick a format</h1>
      <p className="mt-1.5 text-[13px] text-muted">
        Presets auto-fit to {teamCount} teams. Fine-tune the pools and bracket below.
      </p>

      <div className="mt-6">
        <FormatPicker
          presets={FORMAT_PRESETS}
          teamCount={teamCount}
          suggestedId={suggested.id}
          tournamentId={id}
          initialId={currentFormat.presetId}
        />
      </div>
    </DirectorShell>
  );
}
