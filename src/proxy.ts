import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

// Refreshes the session, completes the OAuth token exchange, and redirects
// signed-out visitors to /login. /login, /auth/callback, and /api/auth are
// public. This is an optimistic check only; pages and Server Actions must
// still verify the user themselves.
const middleware = auth.middleware({ loginUrl: "/login" });

export async function proxy(request: NextRequest) {
  return middleware(request);
}

export const config = {
  matcher: [
    // Skip static assets and image optimization files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
