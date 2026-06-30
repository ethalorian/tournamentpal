import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Eyebrow } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col px-6 py-10">
      <Link href="/" className="display text-[18px] tracking-[2px]">
        TOURNAMENTPAL
      </Link>
      <div className="mt-12">
        <Eyebrow>Director sign in</Eyebrow>
        <h1 className="display mt-2 text-[34px]">WELCOME BACK.</h1>
        <p className="mt-2 text-[14px] text-muted">
          Pick up right where your bracket left off.
        </p>
      </div>
      {error === "confirm" && (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-[13px] font-semibold text-danger">
          That confirmation link was invalid or expired. Try signing in.
        </p>
      )}
      <div className="mt-8">
        <AuthForm mode="signin" next={next} />
      </div>
    </div>
  );
}
