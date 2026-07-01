"use server";

import { createClient } from "@/lib/supabase/server";

type SubJSON = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function savePushSubscription(sub: SubJSON): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      { onConflict: "endpoint" }
    );
  return { ok: !error };
}

export async function deletePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
  return { ok: true };
}
