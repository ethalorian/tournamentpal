import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { Eyebrow, Field, inputClass, Button, Badge, EmptyState, Card } from "@/components/ui";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import {
  addFacilitySite,
  removeFacilitySite,
  addFacilityField,
  removeFacilityField,
} from "@/app/director/facilities";

export const dynamic = "force-dynamic";

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ dup?: string; return?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { dup, return: returnTo } = await searchParams;
  // Only honor internal return paths (prevents open-redirect).
  const back = returnTo && returnTo.startsWith("/director/") ? returnTo : null;
  const forwardBtn = back ? (
    <Link
      href={back}
      className="btn-accent flex h-[54px] items-center justify-center rounded-2xl text-[16px]"
    >
      Done — back to event setup →
    </Link>
  ) : null;

  const [{ data: sites }, { data: fields }] = await Promise.all([
    supabase.from("facility_sites").select("*").eq("director_id", user.id).order("name"),
    supabase.from("facility_fields").select("*").eq("director_id", user.id).order("name"),
  ]);
  const siteList = sites ?? [];
  const dupSite = dup ? siteList.find((s) => s.id === dup) : undefined;
  const fieldsBySite = new Map<string, typeof fields>();
  for (const f of fields ?? []) {
    const arr = fieldsBySite.get(f.facility_site_id) ?? [];
    arr.push(f);
    fieldsBySite.set(f.facility_site_id, arr);
  }

  return (
    <DirectorShell>
      <BackLink href={back ?? "/director"} label={back ? "Event setup" : undefined} />
      <h1 className="display mt-3 text-[26px]">Your facilities</h1>
      <p className="mt-1.5 text-[13px] text-muted">
        Set up your parks and diamonds once. When you create a tournament, pull any
        facility in with a single tap on the Fields step.
      </p>

      {forwardBtn && <div className="mt-4">{forwardBtn}</div>}

      {dupSite && (
        <div className="mt-4 rounded-xl border-2 border-ink bg-accent/15 px-4 py-3">
          <div className="text-[13px] font-extrabold">Already in your facilities</div>
          <div className="mt-0.5 text-[12px] text-muted">
            You already have <span className="font-bold text-ink">{dupSite.name}</span>
            {dupSite.address ? ` (${dupSite.address})` : ""} — we didn&apos;t add a
            duplicate. It&apos;s highlighted below; add diamonds to it or pull it into an
            event from the Fields step.
          </div>
        </div>
      )}

      <Eyebrow className="mt-7 mb-3">
        {siteList.length} {siteList.length === 1 ? "facility" : "facilities"}
      </Eyebrow>

      {siteList.length === 0 ? (
        <EmptyState title="No facilities yet" body="Add your first park below — then its diamonds are reusable across every event." />
      ) : (
        <div className="flex flex-col gap-4">
          {siteList.map((s) => {
            const fs = fieldsBySite.get(s.id) ?? [];
            return (
              <div
                key={s.id}
                className={`rounded-2xl border-2 border-ink p-4 ${
                  s.id === dup ? "bg-accent/15 ring-2 ring-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-[16px]">{s.name}</div>
                    {s.address && <div className="mt-0.5 text-[12px] text-muted">{s.address}</div>}
                    {s.parking_info && (
                      <div className="mt-0.5 text-[11px] text-muted">Parking: {s.parking_info}</div>
                    )}
                  </div>
                  <form action={removeFacilitySite}>
                    <input type="hidden" name="site_id" value={s.id} />
                    <button type="submit" className="text-[11px] font-bold text-muted hover:text-danger">
                      Remove
                    </button>
                  </form>
                </div>

                {/* Fields under this facility */}
                {fs.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {fs.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-xl border border-faint px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold">{f.name}</span>
                          {f.lights && <Badge tone="ink">Lights</Badge>}
                          {f.fence_distance && <Badge tone="muted">{f.fence_distance}ft</Badge>}
                          <span className="text-[11px] text-muted">{f.surface ?? "grass"}</span>
                        </div>
                        <form action={removeFacilityField}>
                          <input type="hidden" name="field_id" value={f.id} />
                          <button type="submit" className="text-[11px] font-bold text-muted hover:text-danger">
                            ✕
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add a diamond to this facility */}
                <form action={addFacilityField} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="facility_site_id" value={s.id} />
                  <div className="min-w-[120px] flex-1">
                    <Field label="Add a diamond">
                      <input name="name" required className={inputClass} placeholder="Diamond 1" />
                    </Field>
                  </div>
                  <div className="w-20">
                    <Field label="Fence">
                      <input name="fence_distance" type="number" inputMode="numeric" className={inputClass} placeholder="200" />
                    </Field>
                  </div>
                  <div className="w-24">
                    <Field label="Surface">
                      <select name="surface" className={inputClass}>
                        <option value="grass">Grass</option>
                        <option value="turf">Turf</option>
                        <option value="dirt">Skinned</option>
                      </select>
                    </Field>
                  </div>
                  <label className="flex items-center gap-1.5 pb-3">
                    <input type="checkbox" name="lights" className="h-5 w-5 accent-black" />
                    <span className="text-[13px] font-bold">Lights</span>
                  </label>
                  <Button type="submit" variant="ink" className="mb-[1px]">Add</Button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      {/* Add a new facility */}
      <Card className="mt-6">
        <div className="display text-[16px]">Add a facility</div>
        <form action={addFacilitySite} className="mt-4 flex flex-col gap-4">
          <Field label="Facility name">
            <input name="name" required className={inputClass} placeholder="Cook Park" />
          </Field>
          <Field label="Address" hint="Start typing and pick a suggestion to pin it for directions.">
            <PlacesAutocomplete name="address" placeNameField="place_name" placeholder="Cook Park, Tigard OR" />
          </Field>
          <Field label="Parking notes" hint="Optional — shown to followers for directions.">
            <input name="parking_info" className={inputClass} placeholder="Lot off SW 92nd Ave" />
          </Field>
          <Button type="submit" variant="ink" className="w-full">
            Add facility
          </Button>
        </form>
      </Card>

      {forwardBtn && (
        <div className="mt-6">
          {forwardBtn}
          <p className="mt-2 text-center text-[11px] text-muted">
            Your facilities are saved — head back to pull them into your event.
          </p>
        </div>
      )}
    </DirectorShell>
  );
}
