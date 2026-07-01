import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ScoreShell } from "@/components/ScoreShell";
import { Eyebrow, Badge, EmptyState, Button } from "@/components/ui";
import { signOutAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  co_director: "Co-director",
  scorekeeper: "Scorekeeper",
  marshal: "Field marshal",
};

export default async function ScoreHome() {
  const { user, supabase, profile } = await requireUser();

  const { data: memberships } = await supabase
    .from("tournament_members")
    .select("tournament_id, role")
    .eq("user_id", user.id);

  const ids = (memberships ?? []).map((m) => m.tournament_id);
  const roleOf = new Map((memberships ?? []).map((m) => [m.tournament_id, m.role]));
  const { data: tournaments } = ids.length
    ? await supabase.from("tournaments").select("id,name,status,location").in("id", ids)
    : { data: [] };
  const list = tournaments ?? [];

  return (
    <ScoreShell>
      <Eyebrow>Scorekeeping</Eyebrow>
      <h1 className="display mt-1.5 text-[28px]">Your events</h1>
      <p className="mt-1 text-[13px] text-muted">{profile?.full_name || user.email}</p>

      <div className="mt-6 flex flex-col gap-3 md:grid md:grid-cols-2">
        {list.map((t) => {
          const role = roleOf.get(t.id) ?? "scorekeeper";
          const canScore = role === "scorekeeper" || role === "co_director";
          return (
            <Link
              key={t.id}
              href={canScore ? `/score/${t.id}` : `/t/${t.id}`}
              className="block rounded-2xl border-2 border-ink p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-[16px]">{t.name}</div>
                <Badge tone={t.status === "live" ? "accent" : "muted"}>{t.status}</Badge>
              </div>
              <div className="mt-1 text-[12px] font-medium text-muted">
                {t.location ?? ""} · {ROLE_LABEL[role] ?? role}
              </div>
            </Link>
          );
        })}
      </div>

      {list.length === 0 && (
        <EmptyState title="No assignments" body="A director will add you to their event by email." />
      )}

      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="outline" className="w-full">Sign out</Button>
      </form>
    </ScoreShell>
  );
}
