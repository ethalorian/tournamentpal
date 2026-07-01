import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, Field, inputClass, Button, Badge } from "@/components/ui";
import { BackButton } from "@/components/BackButton";
import { registerTeam } from "@/app/register/actions";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: info } = await supabase.rpc("registration_info", { t_id: id });
  const row = info?.[0];
  if (!row) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col px-6 py-10">
      <div className="mb-4">
        <BackButton fallback="/" />
      </div>
      <Link href="/" className="display text-[18px] tracking-[2px]">
        TOURNAMENT<span className="text-blue">PAL</span>
      </Link>

      <div className="mt-12">
        <Eyebrow>Team registration</Eyebrow>
        <h1 className="display mt-2 text-[30px]">{row.tournament_name}</h1>
        <p className="mt-1 text-[13px] text-muted">{row.sport}</p>

        {!row.is_open ? (
          <p className="mt-6 rounded-xl bg-faint px-4 py-3 text-[13px] font-semibold text-ink">
            Registration for this event is currently closed. Ask the director to open it, or reach out directly.
          </p>
        ) : (
          <>
            {error === "closed" && (
              <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-[13px] font-semibold text-danger">
                Registration just closed — no new teams can be added.
              </p>
            )}
            {error === "name" && (
              <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-[13px] font-semibold text-danger">
                Enter your team name.
              </p>
            )}

            <form action={registerTeam} className="mt-6 flex flex-col gap-4">
              <input type="hidden" name="tournament_id" value={id} />
              <Field label="Team name">
                <input name="name" required className={inputClass} placeholder="Tigard Heat 14U" />
              </Field>
              <Button type="submit" className="w-full">
                Register my team
              </Button>
            </form>

            {!user && (
              <p className="mt-4 text-center text-[12px] text-muted">
                You&apos;ll create a free coach account — then you manage this team and
                message the director.
              </p>
            )}
            {user && (
              <div className="mt-4 flex justify-center">
                <Badge tone="success">Signed in — you&apos;ll manage this team</Badge>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
