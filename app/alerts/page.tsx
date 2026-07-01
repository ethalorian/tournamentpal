import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Eyebrow, inputClass, Button, Field } from "@/components/ui";
import { BackButton } from "@/components/BackButton";
import { PushToggle } from "@/components/PushToggle";
import { saveAlertPrefs } from "@/app/alerts/actions";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { key: "cat_updates", label: "Director updates", hint: "Announcements, schedule changes, results the director sends." },
  { key: "cat_weather", label: "Weather holds", hint: "Delays, postponements, resume times." },
  { key: "cat_concessions", label: "Concessions", hint: "“Grill's open”, sold-out items." },
] as const;

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-3">
      <span>
        <span className="block text-[14px] font-bold">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] text-muted">{hint}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-5 shrink-0 accent-black" />
    </label>
  );
}

export default async function AlertsPrefs({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; next?: string }>;
}) {
  const { saved, next } = await searchParams;
  const { user, supabase, profile } = await requireUser();

  const { data: prefs } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Missing row = everything on.
  const p = {
    channel_sms: prefs?.channel_sms ?? true,
    channel_push: prefs?.channel_push ?? true,
    cat_updates: prefs?.cat_updates ?? true,
    cat_weather: prefs?.cat_weather ?? true,
    cat_concessions: prefs?.cat_concessions ?? true,
  };

  return (
    <div className="app-shell flex min-h-[100dvh] flex-col">
      <header className="flex items-center justify-between bg-ink px-5 py-3.5 text-white md:px-9 md:py-4">
        <Link href="/" className="display text-[15px] tracking-[1.5px] md:text-[18px]">
          TOURNAMENTPAL
        </Link>
        <span className="display text-[12px] tracking-[1.5px] text-accent">ALERTS</span>
      </header>

      <div className="flex-1 px-5 pb-10 pt-6 md:px-9">
        <div className="mb-4">
          <BackButton fallback={next ?? "/"} />
        </div>
        <Eyebrow>Notifications</Eyebrow>
        <h1 className="display mt-1.5 text-[28px]">Alert preferences</h1>
        <p className="mt-1 text-[13px] text-muted">
          Choose how you&apos;re reached and what for. Applies to every team you follow.
        </p>

        {saved && (
          <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-[13px] font-semibold text-success">
            Preferences saved.
          </p>
        )}

        <form action={saveAlertPrefs} className="mt-6 flex flex-col gap-6">
          {next && <input type="hidden" name="next" value={next} />}

          <div className="rounded-2xl border border-faint p-4">
            <Eyebrow className="mb-2">How you&apos;re reached</Eyebrow>
            <Toggle name="channel_sms" label="Text alerts (SMS)" defaultChecked={p.channel_sms} />
            <div className="pb-2">
              <Field label="Mobile number" hint="Where text alerts go.">
                <input name="phone" type="tel" inputMode="tel" defaultValue={profile?.phone ?? ""} className={inputClass} placeholder="(555) 123-4567" />
              </Field>
            </div>
            <div className="h-px bg-faint" />
            <Toggle name="channel_push" label="Push notifications" hint="Allow push to devices you've enabled." defaultChecked={p.channel_push} />
            <PushToggle />
          </div>

          <div className="rounded-2xl border border-faint p-4">
            <Eyebrow className="mb-1">What you&apos;re alerted about</Eyebrow>
            {CATEGORIES.map((c, i) => (
              <div key={c.key}>
                {i > 0 && <div className="h-px bg-faint" />}
                <Toggle
                  name={c.key}
                  label={c.label}
                  hint={c.hint}
                  defaultChecked={p[c.key as keyof typeof p] as boolean}
                />
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full">
            Save preferences
          </Button>
        </form>
      </div>
    </div>
  );
}
