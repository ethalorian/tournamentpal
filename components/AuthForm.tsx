"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type AuthState } from "@/app/auth/actions";
import { Button, Field, inputClass } from "@/components/ui";

export function AuthForm({
  mode,
  next,
}: {
  mode: "signin" | "signup";
  next?: string;
}) {
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "signup" && (
        <Field label="Your name">
          <input name="full_name" autoComplete="name" className={inputClass} placeholder="Jordan Rivera" />
        </Field>
      )}
      <Field label="Email">
        <input
          name="email"
          type="email"
          autoComplete="email"
          className={inputClass}
          placeholder="you@club.com"
        />
      </Field>
      <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
        <input
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className={inputClass}
          placeholder="••••••••"
        />
      </Field>

      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] font-semibold text-danger">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="rounded-xl bg-success/10 px-4 py-3 text-[13px] font-semibold text-success">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "One sec…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>

      <p className="mt-2 text-center text-[13px] text-muted">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-bold text-ink">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-ink">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
