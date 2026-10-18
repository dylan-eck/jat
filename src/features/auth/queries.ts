import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | undefined;
};

// Verifies the session JWT on the server. Never use getSession() here: it
// trusts the cookie without verifying it.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // getClaims() checks the token's expiry against the current time, which
  // Cache Components won't allow during prerendering.
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return null;
  }
  return { id: data.claims.sub, email: data.claims.email };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
