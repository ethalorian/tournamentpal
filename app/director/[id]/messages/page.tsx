import Link from "next/link";
import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Eyebrow, Badge, EmptyState, inputClass } from "@/components/ui";
import { directorBroadcast } from "@/app/director/messaging";

export const dynamic = "force-dynamic";

export default async function DirectorInbox({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await loadOwnedTournament(id);

  const [{ data: teams }, { data: messages }] = await Promise.all([
    supabase.from("teams").select("id,name,manager_id").eq("tournament_id", id).order("name"),
    supabase.from("messages").select("*").eq("tournament_id", id).order("created_at"),
  ]);

  const claimed = (teams ?? []).filter((t) => t.manager_id);
  const unclaimed = (teams ?? []).filter((t) => !t.manager_id);
  const msgs = messages ?? [];

  const lastByTeam = new Map<string, (typeof msgs)[number]>();
  const unreadByTeam = new Map<string, number>();
  for (const m of msgs) {
    lastByTeam.set(m.team_id, m);
    if (m.sender_role === "manager" && !m.read_at) {
      unreadByTeam.set(m.team_id, (unreadByTeam.get(m.team_id) ?? 0) + 1);
    }
  }

  return (
    <DirectorShell>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Messages</h1>
      <TournamentNav id={id} />

      {/* Broadcast */}
      <div className="mt-5 rounded-2xl border-2 border-ink p-4">
        <div className="display text-[15px]">Broadcast to all coaches</div>
        <p className="mt-1 text-[12px] text-muted">
          Lands in every claimed team&apos;s thread. {claimed.length} coach{claimed.length === 1 ? "" : "es"} reachable.
        </p>
        <form action={directorBroadcast} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="tournament_id" value={id} />
          <textarea
            name="body"
            rows={2}
            required
            className={`${inputClass} resize-none`}
            placeholder="e.g. Gates open at 7:30am, first pitch 8am sharp."
          />
          <button type="submit" className="btn-accent flex h-12 items-center justify-center rounded-xl text-[14px]">
            Send to all coaches
          </button>
        </form>
      </div>

      <Eyebrow className="mb-3 mt-7">Coaches · {claimed.length}</Eyebrow>
      {claimed.length === 0 ? (
        <EmptyState title="No coaches yet" body="Share a team's claim link so coaches can join and message you." />
      ) : (
        <div className="flex flex-col gap-2">
          {claimed.map((t) => {
            const last = lastByTeam.get(t.id);
            const unread = unreadByTeam.get(t.id) ?? 0;
            return (
              <Link
                key={t.id}
                href={`/director/${id}/messages/${t.id}`}
                className="flex items-center justify-between rounded-2xl border border-faint px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-extrabold text-[14px]">{t.name}</div>
                  <div className="mt-0.5 truncate text-[12px] text-muted">
                    {last ? `${last.sender_role === "director" ? "You: " : ""}${last.body}` : "No messages yet"}
                  </div>
                </div>
                {unread > 0 && <Badge tone="danger">{unread}</Badge>}
              </Link>
            );
          })}
        </div>
      )}

      {unclaimed.length > 0 && (
        <>
          <Eyebrow className="mb-3 mt-6">Not claimed yet · {unclaimed.length}</Eyebrow>
          <div className="flex flex-col gap-2">
            {unclaimed.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-dashed border-faint px-4 py-3">
                <span className="text-[14px] font-bold">{t.name}</span>
                <span className="font-mono text-[11px] text-muted">/claim/{t.id.slice(0, 8)}…</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">Share each team&apos;s claim link from the Teams step.</p>
        </>
      )}
    </DirectorShell>
  );
}
