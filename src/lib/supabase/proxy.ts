import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";
import { env } from "./env";

// Refreshes the auth session and writes updated cookies to the response.
// This is an optimistic check only; pages and Server Actions must still
// verify the user themselves.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Do not run code between createServerClient and getClaims(); it can
  // cause users to be randomly logged out.
  const { data } = await supabase.auth.getClaims();

  // Optimistic redirect for signed-out visitors; not authorization.
  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/login" || pathname.startsWith("/auth/");
  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    // Carry over any refreshed or cleared session cookies.
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return response;
}
