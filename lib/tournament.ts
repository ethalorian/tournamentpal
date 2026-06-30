import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { Tables } from "@/lib/database.types";

/**
 * Loads a tournament owned by the current director, or 404s. Returns the
 * tournament plus the authenticated Supabase client for further queries.
 */
export async function loadOwnedTournament(id: string) {
  const { supabase, user } = await requireUser();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .eq("director_id", user.id)
    .single();
  if (!tournament) notFound();
  return { tournament: tournament as Tables<"tournaments">, supabase, user };
}
