import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * STUB notification dispatcher.
 *
 * In production this would fan out to Twilio (SMS) and a Web Push service.
 * For now it records what *would* have been sent into `notifications_log`
 * and logs to the server console, so the whole product flow works end-to-end
 * without paid accounts. Swap the body of `deliver()` for the real providers
 * once TWILIO_* / push keys are configured.
 */
export type NotifyInput = {
  tournamentId: string;
  type: "score_posted" | "published" | "weather_hold" | "broadcast" | "concessions";
  title: string;
  body: string;
  recipientCount?: number;
  payload?: Record<string, unknown>;
};

async function deliver(input: NotifyInput) {
  // Real providers go here. Stubbed:
  console.log(
    `[notify:stub] (${input.type}) "${input.title}" → ${
      input.recipientCount ?? 0
    } follower(s): ${input.body}`
  );
}

export async function notifyFollowers(input: NotifyInput) {
  const supabase = await createClient();

  // Count followers of teams in this tournament (the would-be recipients).
  let recipientCount = input.recipientCount ?? 0;
  if (input.recipientCount === undefined) {
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", input.tournamentId);
    recipientCount = count ?? 0;
  }

  await deliver({ ...input, recipientCount });

  await supabase.from("notifications_log").insert({
    tournament_id: input.tournamentId,
    type: input.type,
    title: input.title,
    body: input.body,
    recipient_count: recipientCount,
    payload: (input.payload ?? {}) as never,
  });

  return { recipientCount };
}
