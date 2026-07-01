import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, Field, inputClass, Button } from "@/components/ui";
import { BackButton } from "@/components/BackButton";
import { claimTeam } from "@/app/manager/actions";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col px-6 py-10">
      <div className="mb-4">
        <BackButton fallback="/" />
      </div>
      <Link href="/" className="display text-[18px] tracking-[2px]">
        TOURNAMENT<span className="text-blue">PAL</span>
      </Link>
      <div className="mt-12">{children}</div>
    </div>
  );
}

export default async function ClaimPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: info } = await supabase.rpc("claim_info", { t_team: teamId });
  const row = info?.[0];
  if (!row) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already claimed
  if (row.claimed) {
    return (
      <Shell>
        <Eyebrow>Team invite</Eyebrow>
        <h1 className="display mt-2 text-[30px]">{row.team_name}</h1>
        <p className="mt-1 text-[13px] text-muted">{row.tournament_name}</p>
        {row.manager_is_me ? (
          <>
            <p className="mt-6 rounded-xl bg-success/10 px-4 py-3 text-[13px] font-semibold text-success">
              You already manage this team.
            </p>
            <Link href={`/manager/${teamId}`} className="btn-accent mt-4 flex h-13 items-center justify-center rounded-2xl" style={{ height: 54 }}>
              Open team dashboard
            </Link>
          </>
        ) : (
          <p className="mt-6 rounded-xl bg-faint px-4 py-3 text-[13px] font-semibold text-ink">
            This team has already been claimed by another coach. Contact the
            director if this isn&apos;t right.
          </p>
        )}
      </Shell>
    );
  }

  // Unclaimed — needs sign in / claim
  return (
    <Shell>
      <Eyebrow>You&apos;re invited to manage</Eyebrow>
      <h1 className="display mt-2 text-[32px]">{row.team_name}</h1>
      <p className="mt-1 text-[13px] text-muted">{row.tournament_name}</p>

      {user ? (
        <form action={claimTeam} className="mt-8 flex flex-col gap-4">
          <input type="hidden" name="team_id" value={teamId} />
          <Field label="Mobile number" hint="So the director's messages reach you. Optional.">
            <input name="phone" type="tel" inputMode="tel" className={inputClass} placeholder="(555) 123-4567" />
          </Field>
          <Button type="submit" className="w-full">
            Claim {row.team_name}
          </Button>
        </form>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={`/signup?role=manager&next=/claim/${teamId}`}
            className="btn-accent flex h-14 items-center justify-center rounded-2xl text-[15px]"
          >
            Create a free coach account
          </Link>
          <Link
            href={`/login?next=/claim/${teamId}`}
            className="flex h-14 items-center justify-center rounded-2xl border-2 border-ink text-[14px] font-extrabold uppercase tracking-wide"
          >
            I already have an account
          </Link>
          <p className="mt-1 text-center text-[12px] text-muted">
            Claiming lets you message the director and get score alerts for your team.
          </p>
        </div>
      )}
    </Shell>
  );
}
