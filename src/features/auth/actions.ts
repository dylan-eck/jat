"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { magicLinkSchema } from "./schema";

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

// Build absolute URLs from the request so the browser comes back to the same
// host it started on (localhost vs 127.0.0.1, or a preview deployment), where
// its auth cookies live.
async function appUrl(path: string) {
  const h = await headers();
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return new URL(path, origin).toString();
}

export async function sendMagicLink(
  _prevState: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid email.",
    };
  }

  const { error } = await auth.signIn.magicLink({
    email: parsed.data.email,
    callbackURL: await appUrl("/auth/callback"),
    errorCallbackURL: await appUrl("/login?error=callback"),
  });
  if (error) {
    console.error("signIn.magicLink failed", error);
    return {
      status: "error",
      message: "Couldn't send the link. Wait a moment and try again.",
    };
  }

  return { status: "sent", email: parsed.data.email };
}

export async function signInWithGitHub() {
  const { data, error } = await auth.signIn.social({
    provider: "github",
    callbackURL: await appUrl("/auth/callback"),
    errorCallbackURL: await appUrl("/login?error=github"),
  });
  if (error || !data?.url) {
    console.error("signIn.social failed", error);
    redirect("/login?error=github");
  }
  redirect(data.url);
}

export type SignOutState =
  | { status: "idle" }
  | { status: "error"; message: string };

// Only redirect once Neon Auth has ended the session and cleared the cookies.
// On failure (e.g. a network error) the SDK leaves the cookies in place, so
// redirecting would show /login while the browser is still signed in.
export async function signOut(_prevState: SignOutState): Promise<SignOutState> {
  const { error } = await auth.signOut();
  if (error) {
    console.error("signOut failed", error);
    return {
      status: "error",
      message: "Couldn't sign out. Check your connection and try again.",
    };
  }
  redirect("/login");
}
