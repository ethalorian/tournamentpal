import "server-only";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

/**
 * Notification dispatcher.
 *
 * Sends real SMS via Twilio when TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
 * TWILIO_FROM_NUMBER are configured; otherwise it logs a stub so the whole
 * product flow still works with no paid account. Every send is recorded in
 * `notifications_log`.
 *
 * Recipients are the phone numbers of followers of the tournament's teams,
 * fetched via the `follower_phones` RPC (SECURITY DEFINER, authorized to the
 * director / scorekeeper only).
 */
export type NotifyInput = {
  tournamentId: string;
  type: "score_posted" | "published" | "weather_hold" | "broadcast" | "concessions";
  title: string;
  body: string;
  recipientCount?: number;
  payload?: Record<string, unknown>;
};

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;
const twilioReady = Boolean(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
const pushReady = Boolean(VAPID_PUBLIC && VAPID_PRIVATE && VAPID_SUBJECT);
if (pushReady) {
  webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC!, VAPID_PRIVATE!);
}

type PushError = { statusCode?: number };

async function sendWebPush(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  title: string,
  body: string,
  category: string
): Promise<number> {
  const { data: subs } = await supabase.rpc("follower_push_subs", {
    t_id: tournamentId,
    p_category: category,
  });
  const list = (subs ?? []) as { endpoint: string; p256dh: string; auth: string }[];
  const payload = JSON.stringify({ title, body, url: `/t/${tournamentId}`, tag: tournamentId });

  let delivered = 0;
  await Promise.all(
    list.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        delivered++;
      } catch (err) {
        const code = (err as PushError)?.statusCode;
        if (code === 404 || code === 410) {
          await supabase.rpc("delete_push_subscription", { p_endpoint: s.endpoint });
        }
      }
    })
  );
  return delivered;
}

async function sendSms(to: string, message: string): Promise<boolean> {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM!, Body: message }),
    }
  );
  if (!res.ok) {
    console.error(`[notify] Twilio error ${res.status}:`, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

function categoryOf(type: NotifyInput["type"]): string {
  switch (type) {
    case "weather_hold":
      return "weather";
    case "concessions":
      return "concessions";
    case "score_posted":
      return "scores";
    default:
      return "updates";
  }
}

export async function notifyFollowers(input: NotifyInput) {
  const supabase = await createClient();
  const category = categoryOf(input.type);

  // Recipients who opted into SMS for this category (authorized via RPC).
  const { data: phones } = await supabase.rpc("follower_phones", {
    t_id: input.tournamentId,
    p_category: category,
  });
  const recipients = (phones ?? []) as string[];
  const message = `${input.title} — ${input.body}`;

  let sent = 0;
  if (twilioReady && recipients.length > 0) {
    const results = await Promise.all(recipients.map((to) => sendSms(to, message)));
    sent = results.filter(Boolean).length;
  } else {
    console.log(
      `[notify:${twilioReady ? "no-recipients" : "stub"}] (${input.type}) "${input.title}" → ${recipients.length} follower(s): ${input.body}`
    );
  }

  // Browser Web Push to installed-PWA / subscribed followers.
  const pushed = pushReady
    ? await sendWebPush(supabase, input.tournamentId, input.title, input.body, category)
    : 0;

  const smsCount = twilioReady ? sent : recipients.length;
  const recipientCount = input.recipientCount ?? Math.max(smsCount, pushed);
  const channels = [twilioReady ? "sms" : null, pushReady ? "push" : null].filter(Boolean);

  await supabase.from("notifications_log").insert({
    tournament_id: input.tournamentId,
    type: input.type,
    title: input.title,
    body: input.body,
    recipient_count: recipientCount,
    payload: {
      ...(input.payload ?? {}),
      channels: channels.length ? channels : ["stub"],
      sms: smsCount,
      push: pushed,
    } as never,
  });

  return { recipientCount, sms: smsCount, push: pushed, channels };
}
