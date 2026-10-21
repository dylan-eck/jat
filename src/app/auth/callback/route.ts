import { type NextRequest, NextResponse } from "next/server";
import { resolveNextUrl } from "@/features/auth/redirect";
import { initializeUser } from "@/features/stages/initialize";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";

// Neon Auth sends the browser back here with a one-time verifier after a
// magic link or GitHub sign-in.
const verifierParam = "neon_auth_session_verifier";

// Magic links and GitHub sign-in both end here. proxy.ts exchanges the
// verifier for a session cookie only when sign-in left a challenge cookie,
// which GitHub does but magic links don't, so a remaining verifier is
// exchanged here. First sign-ins get their profile and default stages.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const verifier = searchParams.get(verifierParam);
  // getSession forwards every query param to Neon Auth, but its type only
  // lists the documented ones, hence the variable instead of a literal.
  const exchange = { disableCookieCache: "true", [verifierParam]: verifier };
  const { data, error } = await auth.getSession(
    verifier ? { query: exchange } : undefined,
  );
  if (error || !data?.user) {
    if (error) {
      console.error("getSession failed after sign-in", error);
    }
    return NextResponse.redirect(new URL("/login?error=callback", origin));
  }

  await initializeUser(db, data.user.id);

  return NextResponse.redirect(
    resolveNextUrl(searchParams.get("next"), origin),
  );
}
