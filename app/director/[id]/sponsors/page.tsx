import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Eyebrow, Field, inputClass, Button, Badge, EmptyState, Card } from "@/components/ui";
import { addSponsor, removeSponsor } from "@/app/director/sponsors";

export const dynamic = "force-dynamic";

export default async function SponsorsManage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await loadOwnedTournament(id);

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("*")
    .eq("tournament_id", id)
    .order("sort");
  const list = sponsors ?? [];

  return (
    <DirectorShell>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Sponsors</h1>
      <TournamentNav id={id} />

      <p className="mt-4 text-[12px] text-muted">
        Placements show on the public follower home — a revenue line you sell.
      </p>

      <Eyebrow className="mb-3 mt-6">{list.length} sponsor{list.length === 1 ? "" : "s"}</Eyebrow>
      {list.length === 0 ? (
        <EmptyState title="No sponsors yet" body="Add your first placement below." />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-faint px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold">{s.name}</span>
                {s.tier === "headline" && <Badge tone="accent">Headline</Badge>}
              </div>
              <form action={removeSponsor}>
                <input type="hidden" name="tournament_id" value={id} />
                <input type="hidden" name="sponsor_id" value={s.id} />
                <button type="submit" className="text-[12px] font-bold text-muted hover:text-danger">Remove</button>
              </form>
            </div>
          ))}
        </div>
      )}

      <Card className="mt-4">
        <div className="display text-[15px]">Add sponsor</div>
        <form action={addSponsor} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="tournament_id" value={id} />
          <Field label="Sponsor name">
            <input name="name" required className={inputClass} placeholder="Cascade Sports Grill" />
          </Field>
          <Field label="Link (optional)">
            <input name="url" className={inputClass} placeholder="cascadegrill.com" />
          </Field>
          <Field label="Tier">
            <select name="tier" className={inputClass} defaultValue="standard">
              <option value="standard">Standard</option>
              <option value="headline">Headline</option>
            </select>
          </Field>
          <Button type="submit" variant="ink" className="w-full">Add sponsor</Button>
        </form>
      </Card>
    </DirectorShell>
  );
}
