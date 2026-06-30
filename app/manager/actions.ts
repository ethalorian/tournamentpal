"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function claimTeam(formData: FormData) {
  const teamId = String(formData.get("team_id") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/signup?role=manager&next=/claim/${teamId}`);

  await supabase.rpc("claim_team", { t_team: teamId });

  if (phone) {
    await supabase.from("profiles").update({ phone }).eq("id", user.id);
  }

  revalidatePath("/manager");
  redirect(`/manager/${teamId}`);
}

export async function managerSendMessage(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("messages").insert({
    tournament_id: tournamentId,
    team_id: teamId,
    sender_id: user.id,
    sender_role: "manager",
    body,
  });

  // STUB: would push/text the director that a manager replied.
  console.log(`[notify:stub] manager message to director (team ${teamId}): ${body}`);

  revalidatePath(`/manager/${teamId}/messages`);
  revalidatePath(`/director/${tournamentId}/messages/${teamId}`);
}

/** Mark director→manager messages in this thread as read. */
export async function markThreadReadByManager(tournamentId: string, teamId: string) {
  const supabase = await createClient();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .eq("sender_role", "director")
    .is("read_at", null);
  revalidatePath(`/manager/${teamId}/messages`);
}
