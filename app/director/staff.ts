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

export async function addStaff(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "scorekeeper");

  const { supabase } = await authed();
  const { data: status } = await supabase.rpc("add_staff_by_email", {
    t_id: tournamentId,
    p_email: email,
    p_role: role,
  });

  revalidatePath(`/director/${tournamentId}/staff`);
  redirect(`/director/${tournamentId}/staff?status=${status ?? "error"}`);
}

export async function removeStaff(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const { supabase } = await authed();
  await supabase
    .from("tournament_members")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId);
  revalidatePath(`/director/${tournamentId}/staff`);
}
