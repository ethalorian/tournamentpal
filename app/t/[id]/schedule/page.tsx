import { loadPublicTournament } from "@/lib/public";
import { FollowerShell } from "@/components/FollowerShell";
import { Eyebrow, Badge, EmptyState } from "@/components/ui";
import { dayLabel, gameTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PublicSchedule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament, supabase } = await loadPublicTournament(id);

  const [{ data: teams }, { data: games }, { data: fields }] = await Promise.all([
    supabase.from("teams").select("id,name").eq("tournament_id", id),
    supabase.from("games").select("*").eq("tournament_id", id).order("scheduled_at"),
    supabase.from("fields").select("id,name").eq("tournament_id", id),
  ]);
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const fieldName = new Map((fields ?? []).map((f) => [f.id, f.name]));
  const nm = (tid: string | null) => (tid ? teamName.get(tid) ?? "TBD" : "TBD");

  // Group by calendar day.
  const groups = new Map<string, typeof games>();
  for (const g of games ?? []) {
    const key = g.scheduled_at
      ? new Date(g.scheduled_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
      : "Unscheduled";
    const arr = groups.get(key) ?? [];
    arr!.push(g);
    groups.set(key, arr);
  }

  return (
    <FollowerShell
      id={id}
      tournamentName={tournament.name}
      dayLabel={dayLabel(tournament)}
      hold={{ status: tournament.hold_status, note: tournament.hold_note, until: tournament.hold_until }}
    >
      <h2 className="display -mt-2 mb-4 text-[18px] text-muted">Full schedule</h2>

      {(!games || games.length === 0) && <EmptyState title="No games scheduled yet" />}

      {[...groups.entries()].map(([day, dayGames]) => (
        <div key={day} className="mb-6">
          <Eyebrow className="mb-2">{day}</Eyebrow>
          <div className="flex flex-col gap-2">
            {dayGames!.map((g) => {
              const isFinal = g.status === "final";
              return (
                <div key={g.id} className="rounded-xl border border-faint px-3.5 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted">
                      {g.bracket_slot ?? "Pool"} · {g.field_id ? fieldName.get(g.field_id) : "Field TBD"}
                    </span>
                    {isFinal ? (
                      <Badge tone="muted">Final</Badge>
                    ) : (
                      <span className="text-[11px] font-semibold text-muted">{gameTime(g.scheduled_at)}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[14px]">
                    <span className="font-bold">{nm(g.home_team_id)}</span>
                    {isFinal && <span className="display text-[16px]">{g.home_score}</span>}
                  </div>
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="font-bold">{nm(g.away_team_id)}</span>
                    {isFinal && <span className="display text-[16px]">{g.away_score}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </FollowerShell>
  );
}
