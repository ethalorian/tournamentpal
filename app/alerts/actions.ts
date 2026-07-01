"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveAlertPrefs(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/alerts");

  const on = (k: string) => formData.get(k) === "on";
  const phone = String(formData.get("phone") ?? "").trim();

  await supabase.from("notification_prefs").upsert(
    {
      user_id: user.id,
      channel_sms: on("channel_sms"),
      channel_push: on("channel_push"),
      cat_updates: on("cat_updates"),
      cat_weather: on("cat_weather"),
      cat_concessions: on("cat_concessions"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  await supabase.from("profiles").update({ phone: phone || null }).eq("id", user.id);

  revalidatePath("/alerts");
  const next = String(formData.get("next") ?? "/alerts");
  redirect(`${next}${next.includes("?") ? "&" : "?"}saved=1`);
}
