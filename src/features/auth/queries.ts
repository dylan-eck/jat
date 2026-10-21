import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth/server";

export type CurrentUser = {
  id: string;
  email: string | undefined;
};

// Reads the session on the server: from the signed session-data cookie while
// it is fresh, otherwise from Neon Auth.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // The session depends on the request's cookies and the current time, which
  // Cache Components won't allow during prerendering.
  await connection();
  const { data, error } = await auth.getSession();
  if (error || !data?.user) {
    return null;
  }
  return { id: data.user.id, email: data.user.email };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
