import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Eyebrow } from "@/components/ui";

export default function SignupPage() {
  return (
    <div className="app-shell flex min-h-[100dvh] flex-col px-6 py-10">
      <Link href="/" className="display text-[18px] tracking-[2px]">
        TOURNAMENTPAL
      </Link>
      <div className="mt-12">
        <Eyebrow>Run your first event</Eyebrow>
        <h1 className="display mt-2 text-[34px]">START DIRECTING.</h1>
        <p className="mt-2 text-[14px] text-muted">
          Create an account and build a tournament from a preset in minutes.
        </p>
      </div>
      <div className="mt-8">
        <AuthForm mode="signup" />
      </div>
      <p className="mt-6 text-[12px] text-muted">
        Following a team instead?{" "}
        <Link href="/" className="font-bold text-ink">
          Followers join free from a director&apos;s link.
        </Link>
      </p>
    </div>
  );
}
