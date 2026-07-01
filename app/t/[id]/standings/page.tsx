import Link from "next/link";
import { loadPublicTournament } from "@/lib/public";
import { FollowerShell } from "@/components/FollowerShell";
import { Eyebrow, EmptyState } from "@/components/ui";
import { dayLabel } from "@/lib/format";
import { buildStandingsTables } from "@/lib/standings-data";
import type { Rules } from "@/lib/engine/types";

export const dynamic = "force-dynamic";

export default async function PublicStandings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament, supabase } = await loadPublicTournament(id);
  const rules = (tournament.rules ?? undefined) as Rules | undefined;
  const tables = await buildStandingsTables(supabase, id, rules);

  const empty = tables.every((t) => t.rows.length === 0);

  return (
    <FollowerShell
      id={id}
      tournamentName={tournament.name}
      dayLabel={dayLabel(tournament)}
      hold={{ status: tournament.hold_status, note: tournament.hold_note, until: tournament.hold_until }}
    >
      <h2 className="display -mt-2 mb-4 text-[18px] text-muted">Standings</h2>

      {empty ? (
        <EmptyState title="No standings yet" body="They appear once pool games are posted." />
      ) : (
        tables.map((table) => (
          <div key={table.name} className="mb-6">
            <Eyebrow className="mb-2">{table.name}</Eyebrow>
            <div className="overflow-hidden rounded-2xl border border-faint">
              <div className="flex bg-ink px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white">
                <span className="w-6">#</span>
                <span className="flex-1">Team</span>
                <span className="w-14 text-center">W-L</span>
                <span className="w-12 text-right">Diff</span>
              </div>
              {table.rows.map((r, i) => (
                <Link
                  key={r.teamId}
                  href={`/t/${id}/team/${r.teamId}`}
                  className={`flex items-center px-3 py-2.5 text-[13px] ${i % 2 ? "bg-haze" : "bg-white"}`}
                >
                  <span className="display w-6 text-[14px]">{r.rank}</span>
                  <span className="flex-1 font-bold">{r.name}</span>
                  <span className="w-14 text-center font-bold">
                    {r.wins}-{r.losses}
                    {r.ties ? `-${r.ties}` : ""}
                  </span>
                  <span className={`w-12 text-right font-bold ${r.runDiff > 0 ? "text-success" : r.runDiff < 0 ? "text-danger" : ""}`}>
                    {r.runDiff > 0 ? "+" : ""}
                    {r.runDiff}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </FollowerShell>
  );
}
