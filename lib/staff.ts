import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { Tables } from "@/lib/database.types";

/** Loads a tournament the current user is allowed to post scores for. */
export async function loadScoreable(id: string) {
  const { supabase, user } = await requireUser();

  const { data: allowed } = await supabase.rpc("can_score", { t_id: id });
  if (!allowed) notFound();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();
  if (!tournament) notFound();

  return { supabase, user, tournament: tournament as Tables<"tournaments"> };
}
