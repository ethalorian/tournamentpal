import { loadOwnedTournament } from "@/lib/tournament";
import { DirectorShell, BackLink } from "@/components/DirectorShell";
import { TournamentNav } from "@/components/TournamentNav";
import { Eyebrow, Field, inputClass, Button, Badge, EmptyState, Card } from "@/components/ui";
import { addStaff, removeStaff } from "@/app/director/staff";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  co_director: "Co-director",
  scorekeeper: "Scorekeeper",
  marshal: "Field marshal",
};

const STATUS_MSG: Record<string, { tone: "success" | "danger"; text: string }> = {
  ok: { tone: "success", text: "Staff member added." },
  no_user: { tone: "danger", text: "No account found for that email — ask them to sign up first." },
  self: { tone: "danger", text: "You're already the director." },
  not_owner: { tone: "danger", text: "Only the director can add staff." },
  bad_role: { tone: "danger", text: "Pick a valid role." },
};

export default async function StaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const { supabase } = await loadOwnedTournament(id);

  const { data: members } = await supabase
    .from("tournament_members")
    .select("user_id, role, created_at")
    .eq("tournament_id", id)
    .order("created_at");

  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const msg = status ? STATUS_MSG[status] : undefined;

  return (
    <DirectorShell>
      <BackLink href={`/director/${id}`} />
      <h1 className="display mt-3 text-[26px]">Staff &amp; roles</h1>
      <TournamentNav id={id} />

      <p className="mt-4 text-[12px] text-muted">
        Scorekeepers and co-directors can post scores from their own login.
        Marshals get read access. They must have a free account first.
      </p>

      {msg && (
        <p className={`mt-4 rounded-xl px-4 py-3 text-[13px] font-semibold ${msg.tone === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
          {msg.text}
        </p>
      )}

      <Card className="mt-5">
        <div className="display text-[15px]">Invite staff</div>
        <form action={addStaff} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="tournament_id" value={id} />
          <Field label="Their email">
            <input name="email" type="email" required className={inputClass} placeholder="scorekeeper@club.com" />
          </Field>
          <Field label="Role">
            <select name="role" className={inputClass} defaultValue="scorekeeper">
              <option value="scorekeeper">Scorekeeper — can post scores</option>
              <option value="co_director">Co-director — can post scores</option>
              <option value="marshal">Field marshal — read only</option>
            </select>
          </Field>
          <Button type="submit" variant="ink" className="w-full">Add staff</Button>
        </form>
      </Card>

      <Eyebrow className="mb-3 mt-7">{(members ?? []).length} staff</Eyebrow>
      {(members ?? []).length === 0 ? (
        <EmptyState title="No staff yet" body="Add a scorekeeper so you're not the only one posting finals." />
      ) : (
        <div className="flex flex-col gap-2">
          {(members ?? []).map((m) => (
            <div key={m.user_id} className="flex items-center justify-between rounded-xl border border-faint px-3.5 py-2.5">
              <div>
                <div className="text-[14px] font-bold">{nameOf.get(m.user_id) || "Staff member"}</div>
                <Badge tone="muted">{ROLE_LABEL[m.role] ?? m.role}</Badge>
              </div>
              <form action={removeStaff}>
                <input type="hidden" name="tournament_id" value={id} />
                <input type="hidden" name="user_id" value={m.user_id} />
                <button type="submit" className="text-[12px] font-bold text-muted hover:text-danger">Remove</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </DirectorShell>
  );
}
