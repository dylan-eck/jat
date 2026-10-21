import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { requiredEnv } from "@/lib/env";

// Server-side Neon Auth: session reads, sign-in/out, the /api/auth proxy, and
// the proxy.ts middleware all go through this one instance.
export const auth = createNeonAuth({
  baseUrl: requiredEnv("NEON_AUTH_BASE_URL"),
  cookies: { secret: requiredEnv("NEON_AUTH_COOKIE_SECRET") },
});
