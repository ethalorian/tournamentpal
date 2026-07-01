import { loadPublicTournament } from "@/lib/public";
import { FollowerShell } from "@/components/FollowerShell";
import { Eyebrow, Badge, EmptyState } from "@/components/ui";
import { dayLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

function price(cents: number) {
  return cents ? `$${(cents / 100).toFixed(2)}` : "";
}

export default async function FollowerConcessions({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament, supabase } = await loadPublicTournament(id);

  const { data: items } = await supabase
    .from("concessions")
    .select("*")
    .eq("tournament_id", id)
    .order("sort");
  const list = items ?? [];

  return (
    <FollowerShell
      id={id}
      tournamentName={tournament.name}
      dayLabel={dayLabel(tournament)}
      hold={{ status: tournament.hold_status, note: tournament.hold_note, until: tournament.hold_until }}
    >
      <h2 className="display -mt-2 mb-4 text-[18px] text-muted">Concessions</h2>

      {list.length === 0 ? (
        <EmptyState title="No menu posted" body="The stand hasn't shared its menu yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-faint">
          {list.map((it, i) => (
            <div
              key={it.id}
              className={`flex items-center justify-between px-4 py-3 ${i % 2 ? "bg-haze" : "bg-white"}`}
            >
              <span className={`text-[15px] font-bold ${it.sold_out ? "text-muted line-through" : ""}`}>
                {it.name}
              </span>
              <div className="flex items-center gap-2">
                {it.sold_out ? (
                  <Badge tone="muted">Sold out</Badge>
                ) : (
                  <span className="display text-[15px]">{price(it.price_cents)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Eyebrow className="mt-6">Cash &amp; cards welcome at the stand</Eyebrow>
    </FollowerShell>
  );
}
