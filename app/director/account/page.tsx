import { requireUser } from "@/lib/auth";
import { DirectorShell } from "@/components/DirectorShell";
import { Eyebrow, Card, Button } from "@/components/ui";
import { signOutAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, profile } = await requireUser();
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

      <Card className="mt-4">
        <div className="text-[13px] font-semibold">Integrations</div>
        <p className="mt-1 text-[12px] text-muted">
          SMS texts, push and payments are stubbed in this build — actions are
          logged so the full flow works without paid accounts. Add provider keys
          in <span className="font-mono">.env.local</span> to switch them on.
        </p>
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
