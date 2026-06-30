"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Follow / unfollow a team. Anonymous visitors are sent to a lightweight
 * follower sign-up that returns them to the team page and completes the follow.
 */
export async function toggleFollow(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  const returnTo = String(formData.get("return_to") ?? `/t/${tournamentId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signup?role=follower&next=${encodeURIComponent(returnTo)}`);
  }

  const { data: existing } = await supabase
    .from("follows")
    .select("team_id")
    .eq("follower_id", user.id)
    .eq("team_id", teamId)
    .maybeSingle();

  if (existing) {
    await supabase.from("follows").delete().eq("follower_id", user.id).eq("team_id", teamId);
  } else {
    await supabase.from("follows").insert({
      follower_id: user.id,
      team_id: teamId,
      tournament_id: tournamentId,
    });
  }

  revalidatePath(returnTo);
  revalidatePath(`/t/${tournamentId}`);
}
