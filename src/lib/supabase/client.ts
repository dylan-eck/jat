import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { env } from "./env";

export function createClient() {
  return createBrowserClient<Database>(env.url, env.publishableKey);
}
