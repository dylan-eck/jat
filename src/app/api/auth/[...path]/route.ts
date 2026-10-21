import { auth } from "@/lib/auth/server";

// Proxies auth requests (magic link verification, OAuth callbacks, session
// refresh) to Neon Auth and sets the session cookies on our domain.
export const { GET, POST } = auth.handler();
