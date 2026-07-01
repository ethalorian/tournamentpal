"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyFollowers } from "@/lib/notify";

const LABELS: Record<string, string> = {
  hold: "Play on hold",
  delay: "Games delayed",
  postponed: "Games postponed",
  cancelled: "Games cancelled",
};

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase };
}

export async function setHold(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const untilRaw = String(formData.get("until") ?? "").trim();
  if (!LABELS[status]) return;

  const until = untilRaw ? new Date(untilRaw).toISOString() : null;
  const { supabase } = await authed();

  await supabase
    .from("tournaments")
    .update({
      hold_status: status,
      hold_note: note || null,
      hold_until: until,
      hold_set_at: new Date().toISOString(),
    })
    .eq("id", tournamentId);

  const timeStr = until
    ? ` Resume ~${new Date(until).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`
    : "";
  await notifyFollowers({
    tournamentId,
    type: "weather_hold",
    title: LABELS[status],
    body: `${note || "The director has updated play status."}${timeStr}`,
  });

  revalidatePath(`/director/${tournamentId}`);
  revalidatePath(`/t/${tournamentId}`);
  redirect(`/director/${tournamentId}/hold`);
}

export async function clearHold(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const { supabase } = await authed();

  await supabase
    .from("tournaments")
    .update({ hold_status: null, hold_note: null, hold_until: null, hold_set_at: new Date().toISOString() })
    .eq("id", tournamentId);

  await notifyFollowers({
    tournamentId,
    type: "weather_hold",
    title: "Play resumed",
    body: "Games are back on. Check the schedule for your next start time.",
  });

  revalidatePath(`/director/${tournamentId}`);
  revalidatePath(`/t/${tournamentId}`);
  redirect(`/director/${tournamentId}/hold`);
}
