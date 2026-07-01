import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { Eyebrow, inputClass, Badge, EmptyState } from "@/components/ui";
import { addTeamFromRecord } from "@/app/director/actions";

export const dynamic = "force-dynamic";

export default async function TeamDirectory({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; setup?: string }>;
}) {
  const { id } = await params;
  const { q, setup } = await searchParams;
  const { supabase, user } = await loadOwnedTournament(id);

  // The director's other events, to source teams from.
  const { data: myEvents } = await supabase
    .from("tournaments")
    .select("id,name")
    .eq("director_id", user.id);
  const eventName = new Map((myEvents ?? []).map((t) => [t.id, t.name]));
  const otherIds = (myEvents ?? []).map((t) => t.id).filter((tid) => tid !== id);

  // Names already in the current tournament (to exclude).
  const { data: current } = await supabase.from("teams").select("name").eq("tournament_id", id);
  const currentNames = new Set((current ?? []).map((t) => t.name.toLowerCase()));

  let prior: { name: string; manager_id: string | null; tournament_id: string }[] = [];
  if (otherIds.length > 0) {
    let query = supabase
      .from("teams")
      .select("name,manager_id,tournament_id,created_at")
      .in("tournament_id", otherIds)
      .order("created_at", { ascending: false })
      .limit(300);
    if (q && q.trim()) query = query.ilike("name", `%${q.trim()}%`);
    const { data } = await query;
    prior = data ?? [];
  }

  // Dedupe by name (keep most recent), drop ones already added here.
  const seen = new Set<string>();
  const records = prior.filter((t) => {
    const key = t.name.toLowerCase();
    if (seen.has(key) || currentNames.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Manager names.
  const mgrIds = [...new Set(records.map((r) => r.manager_id).filter(Boolean) as string[])];
  const { data: profiles } = mgrIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", mgrIds)
    : { data: [] };
  const mgrName = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <DirectorShell showTabs={false}>
      <BackLink href={`/director/${id}/teams${setup === "1" ? "?setup=1" : ""}`} label="Teams" />
      <h1 className="display mt-3 text-[26px]">Reuse a team</h1>
      <p className="mt-1.5 text-[13px] text-muted">
        Add teams from your past events — the coach on file comes with them.
      </p>

      <form className="mt-5">
        <input name="q" defaultValue={q ?? ""} className={inputClass} placeholder="Search your past teams…" />
      </form>

      <Eyebrow className="mb-3 mt-6">{records.length} available</Eyebrow>
      {otherIds.length === 0 ? (
        <EmptyState title="No past events yet" body="Once you've run an event, its teams show up here to reuse." />
      ) : records.length === 0 ? (
        <EmptyState title="Nothing to reuse" body="No stored teams match — every past team may already be added." />
      ) : (
        <div className="flex flex-col gap-2">
          {records.map((r) => (
            <div key={`${r.name}-${r.tournament_id}`} className="flex items-center justify-between gap-2 rounded-xl border border-faint px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-bold">{r.name}</span>
                  {r.manager_id && <Badge tone="success">Coach</Badge>}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-muted">
                  {r.manager_id ? `${mgrName.get(r.manager_id) ?? "Coach on file"} · ` : ""}
                  from {eventName.get(r.tournament_id) ?? "a past event"}
                </div>
              </div>
              <form action={addTeamFromRecord}>
                <input type="hidden" name="tournament_id" value={id} />
                <input type="hidden" name="name" value={r.name} />
                {r.manager_id && <input type="hidden" name="manager_id" value={r.manager_id} />}
                <button type="submit" className="btn-ink flex h-9 shrink-0 items-center rounded-lg px-4 text-[13px]">
                  Add
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </DirectorShell>
  );
}
