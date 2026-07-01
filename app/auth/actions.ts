"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

/** Turn opaque/empty Supabase errors into something a human can act on. */
function friendlyAuthError(raw: string | undefined): string {
  const m = (raw ?? "").trim();
  if (!m || m === "{}" || m === "[object Object]") {
    return "Something went wrong on our end — this usually means the confirmation email couldn't be sent. Try again in a moment, or contact the organizer.";
  }
  if (/confirmation email|sending.*email|email.*send/i.test(m)) {
    return "We couldn't send your confirmation email right now. Please try again shortly.";
  }
  if (/rate limit/i.test(m)) {
    return "Too many attempts for now — please wait a few minutes and try again.";
  }
  if (/already registered|already exists|user already/i.test(m)) {
    return "An account with that email already exists. Try signing in instead.";
  }
  return m;
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/director");

  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendlyAuthError(error.message) };

  revalidatePath("/", "layout");
  redirect(next || "/director");
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "director") === "follower" ? "follower" : "director";
  const next = String(formData.get("next") ?? "") || (role === "follower" ? "/" : "/director");

  if (!fullName || !email || !password)
    return { error: "Name, email and password are all required." };
  if (password.length < 8)
    return { error: "Use a password of at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: friendlyAuthError(error.message) };

  // If email confirmation is disabled, a session is returned immediately.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  return {
    message:
      role === "follower"
        ? "Account created. Check your email to confirm, then you can follow teams and get alerts."
        : "Account created. Check your email to confirm, then sign in to launch your first event.",
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
