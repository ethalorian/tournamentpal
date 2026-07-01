import { loadPublicTournament } from "@/lib/public";
import { FollowerShell } from "@/components/FollowerShell";
import { Eyebrow, Badge, EmptyState } from "@/components/ui";
import { dayLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

function mapsUrl(address: string | null, name: string, lat: number | null, lng: number | null) {
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const q = encodeURIComponent(address || name);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export default async function DirectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament, supabase } = await loadPublicTournament(id);

  const [{ data: sites }, { data: fields }] = await Promise.all([
    supabase.from("sites").select("*").eq("tournament_id", tournament.id).order("name"),
    supabase.from("fields").select("*").eq("tournament_id", tournament.id).order("name"),
  ]);
  const fieldList = fields ?? [];
  const siteList = sites ?? [];
  const orphanFields = fieldList.filter((f) => !f.site_id);

  return (
    <FollowerShell
      id={id}
      tournamentName={tournament.name}
      dayLabel={dayLabel(tournament)}
      hold={{ status: tournament.hold_status, note: tournament.hold_note, until: tournament.hold_until }}
    >
      <h2 className="display -mt-2 mb-4 text-[18px] text-muted">Directions &amp; parking</h2>

      {siteList.length === 0 && orphanFields.length === 0 && (
        <EmptyState title="No venues added yet" body="The director hasn't posted locations." />
      )}

      <div className="flex flex-col gap-4">
        {siteList.map((s) => {
          const siteFields = fieldList.filter((f) => f.site_id === s.id);
          return (
            <div key={s.id} className="rounded-2xl border border-faint p-4">
              <div className="display text-[17px]">{s.name}</div>
              {s.address && <div className="mt-1 text-[13px] text-muted">{s.address}</div>}
              {s.parking_info && (
                <div className="mt-2 rounded-lg bg-haze px-3 py-2 text-[12px]">
                  <span className="font-bold">Parking · </span>
                  {s.parking_info}
                </div>
              )}
              {siteFields.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {siteFields.map((f) => (
                    <Badge key={f.id} tone="muted">
                      {f.name}
                      {f.lights ? " · lights" : ""}
                    </Badge>
                  ))}
                </div>
              )}
              <a
                href={mapsUrl(s.address, s.name, s.lat, s.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ink mt-3 flex h-11 items-center justify-center rounded-xl text-[13px]"
              >
                Open in Maps
              </a>
            </div>
          );
        })}

        {orphanFields.length > 0 && (
          <div className="rounded-2xl border border-faint p-4">
            <Eyebrow className="mb-2">Fields</Eyebrow>
            <div className="flex flex-wrap gap-1.5">
              {orphanFields.map((f) => (
                <Badge key={f.id} tone="muted">
                  {f.name}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-muted">No site/address on file for these fields yet.</p>
          </div>
        )}
      </div>
    </FollowerShell>
  );
}
