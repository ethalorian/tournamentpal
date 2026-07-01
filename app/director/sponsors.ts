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
  return { supabase };
}

export async function addSponsor(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  let url = String(formData.get("url") ?? "").trim();
  const tier = String(formData.get("tier") ?? "standard");
  if (!name) return;
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;

  const { supabase } = await authed();
  const { count } = await supabase
    .from("sponsors")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  await supabase.from("sponsors").insert({
    tournament_id: tournamentId,
    name,
    url: url || null,
    tier: tier === "headline" ? "headline" : "standard",
    sort: count ?? 0,
  });
  revalidatePath(`/director/${tournamentId}/sponsors`);
  revalidatePath(`/t/${tournamentId}`);
}

export async function removeSponsor(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const sponsorId = String(formData.get("sponsor_id") ?? "");
  const { supabase } = await authed();
  await supabase.from("sponsors").delete().eq("id", sponsorId);
  revalidatePath(`/director/${tournamentId}/sponsors`);
  revalidatePath(`/t/${tournamentId}`);
}
