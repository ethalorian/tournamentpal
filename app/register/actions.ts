"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function registerTeam(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/register/${tournamentId}?error=name`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/signup?role=manager&next=${encodeURIComponent(`/register/${tournamentId}`)}`);
  }

  const { data: teamId } = await supabase.rpc("register_team", {
    t_id: tournamentId,
    p_name: name,
  });

  if (!teamId) redirect(`/register/${tournamentId}?error=closed`);
  redirect(`/manager/${teamId}`);
}
