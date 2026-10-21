import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { requiredEnv } from "@/lib/env";
import * as schema from "./schema";

// DATABASE_URL is Neon's pooled connection string. On Vercel Fluid compute,
// attachDatabasePool closes idle connections before an instance suspends.
const pool = new Pool({ connectionString: requiredEnv("DATABASE_URL") });
attachDatabasePool(pool);

export const db = drizzle(pool, { schema });

export type Db = typeof db;
