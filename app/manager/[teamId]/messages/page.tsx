import { loadManagedTeam } from "@/lib/manager";
import { ManagerShell } from "@/components/ManagerShell";
import { BackLink } from "@/components/DirectorShell";
import { Eyebrow } from "@/components/ui";
import { MessageThread } from "@/components/MessageThread";
import { managerSendMessage } from "@/app/manager/actions";

export const dynamic = "force-dynamic";

export default async function ManagerThread({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { supabase, team, tournament } = await loadManagedTeam(teamId);

  const { data: messages } = await supabase
    .from("messages")
    .select("id,sender_role,body,created_at,broadcast")
    .eq("team_id", teamId)
    .order("created_at");

  // Mark director messages read on open.
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .eq("sender_role", "director")
    .is("read_at", null);

  return (
    <ManagerShell teamId={teamId} unread={0}>
      <BackLink href={`/manager/${teamId}`} label={team.name} />
      <div className="mt-3">
        <Eyebrow>Tournament director</Eyebrow>
        <h1 className="display mt-1.5 text-[24px]">{tournament.name}</h1>
      </div>
      <div className="mt-5">
        <MessageThread
          messages={messages ?? []}
          viewerRole="manager"
          action={managerSendMessage}
          tournamentId={tournament.id}
          teamId={teamId}
          placeholder="Message the director…"
        />
      </div>
    </ManagerShell>
  );
}
