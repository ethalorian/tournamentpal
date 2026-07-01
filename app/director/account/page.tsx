import { requireUser } from "@/lib/auth";
import { DirectorShell } from "@/components/DirectorShell";
import { Eyebrow, Card, Button, Badge } from "@/components/ui";
import { signOutAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

const has = (v?: string) => Boolean(v && v.trim());

export default async function AccountPage() {
  const { user, profile } = await requireUser();

  // Real status from configured keys, so directors see what's actually on.
  const twilioOn =
    has(process.env.TWILIO_ACCOUNT_SID) &&
    has(process.env.TWILIO_AUTH_TOKEN) &&
    has(process.env.TWILIO_FROM_NUMBER);
  const pushOn =
    has(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) && has(process.env.VAPID_PRIVATE_KEY);
  const aiOn = has(process.env.ANTHROPIC_API_KEY);
  const mapsOn =
    has(process.env.GOOGLE_MAPS_API_KEY) || has(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  const features: { name: string; desc: string; state: "live" | "on" | "off" | "soon" }[] = [
    { name: "Scheduling & brackets", desc: "Pools, seeding, auto-schedule, byes", state: "live" },
    { name: "Live scores & standings", desc: "Post a score, standings update", state: "live" },
    { name: "Text alerts", desc: "Score & status texts to followers", state: twilioOn ? "on" : "off" },
    { name: "Push notifications", desc: "Browser/app push to followers", state: pushOn ? "on" : "off" },
    { name: "Photo scan & rules AI", desc: "Read teams/menus from a photo; rules summaries", state: aiOn ? "on" : "off" },
    { name: "Maps & directions", desc: "Venue pins and directions", state: mapsOn ? "on" : "off" },
    { name: "Payments", desc: "Online registration fees", state: "soon" },
  ];
  const STATE: Record<string, { label: string; tone: "success" | "muted" | "blue" }> = {
    live: { label: "Live", tone: "success" },
    on: { label: "Active", tone: "success" },
    off: { label: "Off", tone: "muted" },
    soon: { label: "Coming soon", tone: "blue" },
  };
  return (
    <DirectorShell>
      <Eyebrow>Account</Eyebrow>
      <h1 className="display mt-1.5 text-[28px]">{profile?.full_name || "Director"}</h1>

      <Card className="mt-6">
        <Row label="Email" value={user.email ?? "—"} />
        <div className="my-3 h-px bg-faint" />
        <Row label="Role" value={(profile?.role ?? "director").toUpperCase()} />
        <div className="my-3 h-px bg-faint" />
        <Row label="Plan" value="Beta · per-event" />
      </Card>

      <Eyebrow className="mt-7 mb-2">Beta status</Eyebrow>
      <Card>
        <p className="mb-3 text-[12px] text-muted">
          TournamentPal is in private beta. Here&rsquo;s what&rsquo;s switched on right now —
          &ldquo;Off&rdquo; features just need their provider keys added.
        </p>
        <div className="flex flex-col divide-y divide-faint">
          {features.map((f) => (
            <div key={f.name} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">{f.name}</div>
                <div className="text-[11px] text-muted">{f.desc}</div>
              </div>
              <Badge tone={STATE[f.state].tone}>{STATE[f.state].label}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <form action={signOutAction} className="mt-6">
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </DirectorShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="text-[14px] font-semibold">{value}</span>
    </div>
  );
}
