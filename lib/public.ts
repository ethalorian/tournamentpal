import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

/**
 * Loads a publicly-visible tournament for the anonymous follower view.
 * RLS only returns rows whose status is published/live/completed, so drafts
 * 404 for everyone except their director (who reads them through /director).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadPublicTournament(idOrSlug: string) {
  const supabase = await createClient();
  const base = supabase.from("tournaments").select("*");
  const { data: tournament } = await (UUID_RE.test(idOrSlug)
    ? base.eq("id", idOrSlug)
    : base.eq("slug", idOrSlug)
  ).maybeSingle();
  if (!tournament || tournament.status === "draft") notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { tournament: tournament as Tables<"tournaments">, supabase, user };
}
