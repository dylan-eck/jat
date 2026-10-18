"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { magicLinkSchema } from "./schema";

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

// Build the callback URL from the request so the browser comes back to the
// same host it started on (localhost vs 127.0.0.1); the PKCE code verifier
// cookie is only readable there.
async function callbackUrl() {
  const h = await headers();
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return `${origin}/auth/callback`;
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: await callbackUrl() },
  });
  if (error) {
    console.error("signInWithOtp failed", error);
    return {
      status: "error",
      message: "Couldn't send the link. Wait a moment and try again.",
    };
  }

  return { status: "sent", email: parsed.data.email };
}

export async function signInWithGitHub() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: await callbackUrl() },
  });
  if (error) {
    console.error("signInWithOAuth failed", error);
    redirect("/login?error=github");
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
