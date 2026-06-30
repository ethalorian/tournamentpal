import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ManagerListShell } from "@/components/ManagerShell";
import { Eyebrow, Badge, Button, EmptyState } from "@/components/ui";
import { signOutAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function ManagerTeams() {
  const { user, supabase, profile } = await requireUser();

  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("manager_id", user.id)
    .order("created_at");

  const list = teams ?? [];

  // Tournament names for the cards.
  const tIds = [...new Set(list.map((t) => t.tournament_id))];
  const { data: tournaments } = tIds.length
    ? await supabase.from("tournaments").select("id,name,status,location").in("id", tIds)
    : { data: [] };
  const tMap = new Map((tournaments ?? []).map((t) => [t.id, t]));

  return (
    <ManagerListShell>
      <Eyebrow>Coach</Eyebrow>
      <h1 className="display mt-1.5 text-[28px]">Your teams</h1>
      <p className="mt-1 text-[13px] text-muted">{profile?.full_name || user.email}</p>

      <div className="mt-6 flex flex-col gap-3 md:grid md:grid-cols-2">
        {list.map((team) => {
          const t = tMap.get(team.tournament_id);
          return (
            <Link key={team.id} href={`/manager/${team.id}`} className="block rounded-2xl border-2 border-ink p-4">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-[16px]">{team.name}</div>
                {t && <Badge tone={t.status === "live" ? "accent" : "muted"}>{t.status}</Badge>}
              </div>
              <div className="mt-1 text-[12px] font-medium text-muted">
                {t?.name}
                {t?.location ? ` · ${t.location}` : ""}
              </div>
            </Link>
          );
        })}
      </div>

      {list.length === 0 && (
        <EmptyState
          title="No teams yet"
          body="Open the claim link your tournament director shared to take over your team."
        />
      )}

      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </ManagerListShell>
  );
}
