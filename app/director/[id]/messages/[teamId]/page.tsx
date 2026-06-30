import { notFound } from "next/navigation";
import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { Eyebrow } from "@/components/ui";
import { MessageThread } from "@/components/MessageThread";
import { directorSendMessage } from "@/app/director/messaging";

export const dynamic = "force-dynamic";

export default async function DirectorThread({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const { id, teamId } = await params;
  const { supabase } = await loadOwnedTournament(id);

  const { data: team } = await supabase
    .from("teams")
    .select("id,name,tournament_id,manager_id")
    .eq("id", teamId)
    .eq("tournament_id", id)
    .single();
  if (!team) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id,sender_role,body,created_at,broadcast")
    .eq("team_id", teamId)
    .order("created_at");

  // Mark manager messages read on open.
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .eq("sender_role", "manager")
    .is("read_at", null);

  return (
    <DirectorShell showTabs={false}>
      <BackLink href={`/director/${id}/messages`} label="Messages" />
      <div className="mt-3">
        <Eyebrow>{team.manager_id ? "Coach thread" : "Unclaimed team"}</Eyebrow>
        <h1 className="display mt-1.5 text-[24px]">{team.name}</h1>
      </div>
      <div className="mt-5">
        <MessageThread
          messages={messages ?? []}
          viewerRole="director"
          action={directorSendMessage}
          tournamentId={id}
          teamId={teamId}
          placeholder={`Message ${team.name}'s coach…`}
        />
      </div>
    </DirectorShell>
  );
}
