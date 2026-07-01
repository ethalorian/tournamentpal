import Link from "next/link";
import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Stepper } from "@/components/Stepper";
import { Eyebrow, Field, inputClass, Button, EmptyState, Badge, Card } from "@/components/ui";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { addField } from "@/app/director/actions";

export const dynamic = "force-dynamic";

export default async function FieldsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setup?: string }>;
}) {
  const { id } = await params;
  const { setup } = await searchParams;
  const { supabase } = await loadOwnedTournament(id);

  const [{ data: fields }, { data: sites }, { data: divisions }] = await Promise.all([
    supabase.from("fields").select("*").eq("tournament_id", id).order("name"),
    supabase.from("sites").select("*").eq("tournament_id", id),
    supabase.from("divisions").select("*").eq("tournament_id", id).order("sort"),
  ]);
  const siteName = new Map((sites ?? []).map((s) => [s.id, s.name]));
  const fieldList = fields ?? [];
  const divList = divisions ?? [];

  // Wizard chrome only while explicitly in the setup flow (?setup=1). Reaching
  // Fields from the tournament nav shows the management screen instead — even
  // for a draft.
  const isWizard = setup === "1";

  const body = (
    <>
      <Eyebrow className="mt-6 mb-3">
        {fieldList.length} {fieldList.length === 1 ? "field" : "fields"}
      </Eyebrow>
      {fieldList.length === 0 ? (
        <EmptyState title="No fields yet" body="Add a field so the scheduler has somewhere to place games." />
      ) : (
        <div className="flex flex-col gap-2 md:grid md:grid-cols-2">
          {fieldList.map((f) => (
            <div key={f.id} className="rounded-2xl border border-faint p-4">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-[15px]">{f.name}</div>
                <div className="flex gap-1.5">
                  {f.lights && <Badge tone="ink">Lights</Badge>}
                  {f.fence_distance && <Badge tone="muted">{f.fence_distance}ft</Badge>}
                </div>
              </div>
              <div className="mt-1 text-[12px] text-muted">
                {f.site_id ? siteName.get(f.site_id) : "No site"} · {f.surface ?? "grass"}
              </div>
              {f.allowed_divisions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.allowed_divisions.map((d) => (
                    <Badge key={d} tone="accent">
                      {d}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-muted">Open to all divisions</div>
              )}
            </div>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <div className="display text-[16px]">Add a field</div>
        <form action={addField} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="tournament_id" value={id} />
          <Field label="Field name">
            <input name="name" required className={inputClass} placeholder="Diamond 3" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Site name">
              <input name="site_name" className={inputClass} placeholder="Cook Park" />
            </Field>
            <Field label="Fence (ft)">
              <input name="fence_distance" type="number" inputMode="numeric" className={inputClass} placeholder="200" />
            </Field>
          </div>
          <Field label="Address or park name" hint="Start typing and pick a suggestion to pin the exact spot for directions.">
            <PlacesAutocomplete name="address" placeNameField="place_name" placeholder="Cook Park, Tigard OR" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Surface">
              <select name="surface" className={inputClass}>
                <option value="grass">Grass</option>
                <option value="turf">Turf</option>
                <option value="dirt">Skinned</option>
              </select>
            </Field>
            <label className="flex items-end gap-2 pb-3">
              <input type="checkbox" name="lights" className="h-5 w-5 accent-black" />
              <span className="text-[14px] font-bold">Has lights</span>
            </label>
          </div>

          {divList.length > 0 && (
            <Field label="Allowed divisions" hint="Leave all unchecked to allow any division.">
              <div className="flex flex-wrap gap-2">
                {divList.map((d) => (
                  <label key={d.id} className="cursor-pointer">
                    <input type="checkbox" name="allowed_divisions" value={d.name} className="peer sr-only" />
                    <span className="block rounded-full border-2 border-faint px-3 py-1.5 text-[13px] font-bold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
                      {d.name}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          )}

          <Button type="submit" variant="ink" className="w-full">
            Add field
          </Button>
        </form>
      </Card>
    </>
  );

  if (isWizard) {
    return (
      <DirectorShell showTabs={false}>
        <BackLink href={`/director/${id}/teams?setup=1`} label="Teams" />
        <div className="mt-4">
          <Stepper step={3} total={5} label="Fields & locations" />
        </div>
        <h1 className="display mt-5 text-[26px]">Where are you playing?</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Add your diamonds before scheduling — the auto-scheduler places every
          game across these fields.
        </p>

        {body}

        {fieldList.length === 0 && (
          <p className="mt-5 rounded-xl bg-accent/15 px-4 py-3 text-[12px] font-semibold text-ink">
            Add at least one field so games can be scheduled.
          </p>
        )}
        <Link
          href={`/director/${id}/format`}
          className="btn-accent mt-5 flex h-[54px] items-center justify-center rounded-2xl text-[16px]"
          aria-disabled={fieldList.length === 0}
          style={fieldList.length === 0 ? { opacity: 0.5, pointerEvents: "none" } : undefined}
        >
          Pick a format →
        </Link>
      </DirectorShell>
    );
  }

  return (
    <DirectorShell>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Fields &amp; locations</h1>
      <TournamentNav id={id} />
      {body}
    </DirectorShell>
  );
}
