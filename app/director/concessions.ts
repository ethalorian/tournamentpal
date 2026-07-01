"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyFollowers } from "@/lib/notify";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase };
}

export async function addConcession(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dollars = Number(formData.get("price") ?? 0);
  if (!name) return;

  const { supabase } = await authed();
  const { count } = await supabase
    .from("concessions")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  await supabase.from("concessions").insert({
    tournament_id: tournamentId,
    name,
    price_cents: Math.round((isFinite(dollars) ? dollars : 0) * 100),
    sort: count ?? 0,
  });
  revalidatePath(`/director/${tournamentId}/concessions`);
}

/** Add several concessions at once (from a scanned menu photo). */
export async function addScannedConcessions(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const names = formData.getAll("name").map((v) => String(v).trim());
  const prices = formData.getAll("price").map((v) => String(v));
  if (!tournamentId || names.length === 0) return;

  const { supabase } = await authed();
  const { count } = await supabase
    .from("concessions")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);
  const base = count ?? 0;

  const rows: { tournament_id: string; name: string; price_cents: number; sort: number }[] = [];
  for (let i = 0; i < names.length; i++) {
    if (!names[i]) continue;
    const dollars = Number(prices[i]);
    rows.push({
      tournament_id: tournamentId,
      name: names[i],
      price_cents: Math.round((isFinite(dollars) ? dollars : 0) * 100),
      sort: base + rows.length,
    });
  }
  if (rows.length > 0) await supabase.from("concessions").insert(rows);
  revalidatePath(`/director/${tournamentId}/concessions`);
}

export async function toggleSoldOut(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const soldOut = formData.get("sold_out") === "1";
  const { supabase } = await authed();
  await supabase.from("concessions").update({ sold_out: soldOut }).eq("id", itemId);
  revalidatePath(`/director/${tournamentId}/concessions`);
  revalidatePath(`/t/${tournamentId}/concessions`);
}

export async function removeConcession(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const { supabase } = await authed();
  await supabase.from("concessions").delete().eq("id", itemId);
  revalidatePath(`/director/${tournamentId}/concessions`);
}

export async function pushConcessions(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await notifyFollowers({
    tournamentId,
    type: "concessions",
    title: "Concessions",
    body,
  });
  revalidatePath(`/director/${tournamentId}/concessions`);
  redirect(`/director/${tournamentId}/concessions?pushed=1`);
}
