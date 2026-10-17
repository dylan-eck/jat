import { type NextRequest, NextResponse } from "next/server";
import { nextPathSchema } from "@/features/auth/schema";
import { createClient } from "@/lib/supabase/server";

// Both the magic link email and the GitHub OAuth flow land here with a PKCE
// `code`, which is exchanged for a session cookie.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = nextPathSchema.parse(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error("exchangeCodeForSession failed", error);
  }

  return NextResponse.redirect(new URL("/login?error=callback", origin));
}
