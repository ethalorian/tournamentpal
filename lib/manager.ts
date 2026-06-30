import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { Tables } from "@/lib/database.types";

/** Loads a team the current user manages (or 404s), plus its tournament. */
export async function loadManagedTeam(teamId: string) {
  const { supabase, user } = await requireUser();

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .eq("manager_id", user.id)
    .single();
  if (!team) notFound();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", team.tournament_id)
    .single();
  if (!tournament) notFound();

  const { count: unread } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("sender_role", "director")
    .is("read_at", null);

  return {
    supabase,
    user,
    team: team as Tables<"teams">,
    tournament: tournament as Tables<"tournaments">,
    unread: unread ?? 0,
  };
}
