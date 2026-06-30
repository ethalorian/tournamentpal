import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Eyebrow } from "@/components/ui";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; next?: string }>;
}) {
  const { role: roleParam, next } = await searchParams;
  const role = roleParam === "follower" ? "follower" : "director";

  return (
    <div className="app-shell flex min-h-[100dvh] flex-col px-6 py-10">
      <Link href="/" className="display text-[18px] tracking-[2px]">
        TOURNAMENTPAL
      </Link>
      <div className="mt-12">
        <Eyebrow>{role === "follower" ? "Follow your teams" : "Run your first event"}</Eyebrow>
        <h1 className="display mt-2 text-[34px]">
          {role === "follower" ? "GET THE ALERTS." : "START DIRECTING."}
        </h1>
        <p className="mt-2 text-[14px] text-muted">
          {role === "follower"
            ? "Create a free account to follow teams and get a text on every score."
            : "Create an account and build a tournament from a preset in minutes."}
        </p>
      </div>
      <div className="mt-8">
        <AuthForm mode="signup" role={role} next={next} />
      </div>
      {role !== "follower" && (
        <p className="mt-6 text-[12px] text-muted">
          Following a team instead?{" "}
          <Link href="/" className="font-bold text-ink">
            Followers join free from a director&apos;s link.
          </Link>
        </p>
      )}
    </div>
  );
}
