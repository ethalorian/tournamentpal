"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function directorSendMessage(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { supabase, user } = await authed();
  await supabase.from("messages").insert({
    tournament_id: tournamentId,
    team_id: teamId,
    sender_id: user.id,
    sender_role: "director",
    body,
  });
  console.log(`[notify:stub] director → manager (team ${teamId}): ${body}`);

  revalidatePath(`/director/${tournamentId}/messages/${teamId}`);
  revalidatePath(`/manager/${teamId}/messages`);
}

export async function directorBroadcast(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { supabase, user } = await authed();
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .not("manager_id", "is", null);

  const rows = (teams ?? []).map((t) => ({
    tournament_id: tournamentId,
    team_id: t.id,
    sender_id: user.id,
    sender_role: "director" as const,
    body,
    broadcast: true,
  }));
  if (rows.length > 0) await supabase.from("messages").insert(rows);
  console.log(`[notify:stub] director broadcast to ${rows.length} manager(s): ${body}`);

  revalidatePath(`/director/${tournamentId}/messages`);
}

/** Mark manager→director messages in this thread as read. */
export async function markThreadReadByDirector(tournamentId: string, teamId: string) {
  const { supabase } = await authed();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .eq("sender_role", "manager")
    .is("read_at", null);
  revalidatePath(`/director/${tournamentId}/messages`);
}
