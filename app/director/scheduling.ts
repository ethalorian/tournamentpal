"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { regenerateSchedule } from "@/lib/schedule-builder";

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const clean = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return /^\d{1,2}:\d{2}$/.test(s) ? s : null;
};

/** Save the daylight window + game length + buffer for the slot grid. */
export async function saveScheduleConfig(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const config = {
    dayStart: clean(formData.get("day_start")) ?? "08:00",
    dayEnd: clean(formData.get("day_end")) ?? "20:00",
    gameLengthMins: Number(formData.get("game_length") ?? 90) || 90,
    bufferMins: Number(formData.get("buffer") ?? 15) || 0,
  };
  const timezone = String(formData.get("timezone") ?? "").trim();
  const update: Record<string, unknown> = { schedule_config: config };
  if (timezone) update.timezone = timezone;
  await supabase.from("tournaments").update(update as never).eq("id", tournamentId);
  revalidatePath(`/director/${tournamentId}/scheduling`);
}

/** Restrict a division to a time-of-day window (blank = any time). */
export async function saveDivisionWindow(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const divisionId = String(formData.get("division_id") ?? "");
  await supabase
    .from("divisions")
    .update({
      window_start: clean(formData.get("window_start")),
      window_end: clean(formData.get("window_end")),
    })
    .eq("id", divisionId);
  revalidatePath(`/director/${tournamentId}/scheduling`);
}

/** Save a team's field allowlist + availability window. */
export async function saveTeamConstraints(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  const allowed = formData.getAll("allowed_field_ids").map((v) => String(v)).filter(Boolean);
  await supabase
    .from("teams")
    .update({
      allowed_field_ids: allowed,
      avail_start: clean(formData.get("avail_start")),
      avail_end: clean(formData.get("avail_end")),
    })
    .eq("id", teamId);
  revalidatePath(`/director/${tournamentId}/scheduling`);
}

/** Save config/constraints implicitly then rebuild the schedule. */
export async function regenerateWithConstraints(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const { data: t } = await supabase.from("tournaments").select("*").eq("id", tournamentId).single();
  if (!t) throw new Error("Event not found.");
  await regenerateSchedule(supabase, t);
  revalidatePath(`/director/${tournamentId}/scheduling`);
  revalidatePath(`/director/${tournamentId}/scores`);
  redirect(`/director/${tournamentId}/scheduling?rebuilt=1`);
}
