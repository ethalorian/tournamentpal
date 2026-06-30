import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

/**
 * Loads a publicly-visible tournament for the anonymous follower view.
 * RLS only returns rows whose status is published/live/completed, so drafts
 * 404 for everyone except their director (who reads them through /director).
 */
export async function loadPublicTournament(id: string) {
  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();
  if (!tournament || tournament.status === "draft") notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { tournament: tournament as Tables<"tournaments">, supabase, user };
}
