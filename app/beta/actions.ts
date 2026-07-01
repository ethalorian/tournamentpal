"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Validate the private-beta access code. On success, set the `beta_access`
 * cookie the proxy checks and forward to the requested director page.
 */
export async function submitBetaCode(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const nextRaw = String(formData.get("next") ?? "/director");
  const next = nextRaw.startsWith("/") ? nextRaw : "/director";
  const expected = process.env.BETA_ACCESS_CODE ?? "";

  if (!expected || code !== expected) {
    redirect(`/beta?error=1&next=${encodeURIComponent(next)}`);
  }

  const store = await cookies();
  store.set("beta_access", expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  redirect(next);
}
