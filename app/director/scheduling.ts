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

type Matchup = { a: string; b: string; type: "forbid" | "force" | "separate" };

/** Read the tournament's schedule_config object (or {}). */
async function readScheduleConfig(
  supabase: Awaited<ReturnType<typeof client>>["supabase"],
  tournamentId: string
): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from("tournaments")
    .select("schedule_config")
    .eq("id", tournamentId)
    .single();
  return (data?.schedule_config as Record<string, unknown> | null) ?? {};
}

/** Save the daylight window + game length + buffer for the slot grid. */
export async function saveScheduleConfig(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const prev = await readScheduleConfig(supabase, tournamentId);
  const config = {
    // Preserve any keys we don't manage here (e.g. matchups).
    ...prev,
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

/** Add a matchup rule (forbid / force / separate) between two teams. */
export async function addMatchup(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const a = String(formData.get("team_a") ?? "");
  const b = String(formData.get("team_b") ?? "");
  const type = String(formData.get("type") ?? "");
  if (!tournamentId || !a || !b || a === b) return;
  if (type !== "forbid" && type !== "force" && type !== "separate") return;

  const config = await readScheduleConfig(supabase, tournamentId);
  const list = (Array.isArray(config.matchups) ? config.matchups : []) as Matchup[];
  const same = (m: Matchup) =>
    m.type === type &&
    ((m.a === a && m.b === b) || (m.a === b && m.b === a));
  if (!list.some(same)) list.push({ a, b, type });

  await supabase
    .from("tournaments")
    .update({ schedule_config: { ...config, matchups: list } } as never)
    .eq("id", tournamentId);
  revalidatePath(`/director/${tournamentId}/scheduling`);
}

/** Remove a matchup rule by its index in the list. */
export async function removeMatchup(formData: FormData) {
  const { supabase } = await client();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const idx = Number(formData.get("index") ?? -1);
  const config = await readScheduleConfig(supabase, tournamentId);
  const list = (Array.isArray(config.matchups) ? config.matchups : []) as Matchup[];
  if (idx >= 0 && idx < list.length) {
    list.splice(idx, 1);
    await supabase
      .from("tournaments")
      .update({ schedule_config: { ...config, matchups: list } } as never)
      .eq("id", tournamentId);
  }
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
