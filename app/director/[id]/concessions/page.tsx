import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Eyebrow, Field, inputClass, Button, Badge, EmptyState, Card } from "@/components/ui";
import { addConcession, toggleSoldOut, removeConcession, pushConcessions } from "@/app/director/concessions";

export const dynamic = "force-dynamic";

const TEMPLATES = ["Grill's open 🔥", "Fresh coffee at the stand", "Burgers sold out"];

function price(cents: number) {
  return cents ? `$${(cents / 100).toFixed(2)}` : "—";
}

export default async function ConcessionsManage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pushed?: string }>;
}) {
  const { id } = await params;
  const { pushed } = await searchParams;
  const { supabase } = await loadOwnedTournament(id);

  const { data: items } = await supabase
    .from("concessions")
    .select("*")
    .eq("tournament_id", id)
    .order("sort");
  const list = items ?? [];

  return (
    <DirectorShell>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Concessions</h1>
      <TournamentNav id={id} />

      {pushed && (
        <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-[13px] font-semibold text-success">
          Alert sent to followers.
        </p>
      )}

      {/* Push */}
      <Card className="mt-5">
        <div className="display text-[15px]">Push an alert</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <form key={t} action={pushConcessions}>
              <input type="hidden" name="tournament_id" value={id} />
              <input type="hidden" name="body" value={t} />
              <button type="submit" className="rounded-full border-2 border-ink px-3 py-1.5 text-[12px] font-bold active:scale-95">
                {t}
              </button>
            </form>
          ))}
        </div>
        <form action={pushConcessions} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="tournament_id" value={id} />
          <textarea name="body" rows={2} required className={`${inputClass} resize-none`} placeholder="Custom message to followers…" />
          <button type="submit" className="btn-accent flex h-11 items-center justify-center rounded-xl text-[13px]">
            Send custom alert
          </button>
        </form>
      </Card>

      {/* Menu */}
      <Eyebrow className="mb-3 mt-7">Menu · {list.length}</Eyebrow>
      {list.length === 0 ? (
        <EmptyState title="No items yet" body="Build your stand menu below." />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-xl border border-faint px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className={`text-[14px] font-bold ${it.sold_out ? "text-muted line-through" : ""}`}>{it.name}</span>
                <span className="text-[12px] font-semibold text-muted">{price(it.price_cents)}</span>
                {it.sold_out && <Badge tone="danger">Sold out</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <form action={toggleSoldOut}>
                  <input type="hidden" name="tournament_id" value={id} />
                  <input type="hidden" name="item_id" value={it.id} />
                  <input type="hidden" name="sold_out" value={it.sold_out ? "0" : "1"} />
                  <button type="submit" className="rounded-full border border-faint px-2.5 py-1 text-[11px] font-bold">
                    {it.sold_out ? "Restock" : "Sold out"}
                  </button>
                </form>
                <form action={removeConcession}>
                  <input type="hidden" name="tournament_id" value={id} />
                  <input type="hidden" name="item_id" value={it.id} />
                  <button type="submit" className="text-[11px] font-bold text-muted hover:text-danger">✕</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card className="mt-4">
        <div className="display text-[15px]">Add item</div>
        <form action={addConcession} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="tournament_id" value={id} />
          <div className="flex-1">
            <Field label="Name">
              <input name="name" required className={inputClass} placeholder="Cheeseburger" />
            </Field>
          </div>
          <div className="w-24">
            <Field label="Price $">
              <input name="price" type="number" step="0.25" inputMode="decimal" className={inputClass} placeholder="5.00" />
            </Field>
          </div>
          <Button type="submit" variant="ink" className="mb-[1px]">Add</Button>
        </form>
      </Card>
    </DirectorShell>
  );
}
