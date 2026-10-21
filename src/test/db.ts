import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { neonAuthUser } from "@/lib/db/neon-auth";

export { db };

const created: string[] = [];

// Inserts a bare Neon Auth user so FKs to neon_auth."user" are satisfied.
// Every row the app owns cascades from it, so deleteTestUsers() cleans up
// without touching anyone else's data on a shared dev branch.
export async function createTestUser(): Promise<string> {
  const id = randomUUID();
  await db.execute(sql`
    insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    values (${id}, 'Test user', ${`${id}@jat.test`}, true, now(), now())
  `);
  created.push(id);
  return id;
}

export async function deleteTestUsers(): Promise<void> {
  const ids = created.splice(0);
  if (ids.length > 0) {
    await db.delete(neonAuthUser).where(inArray(neonAuthUser.id, ids));
  }
}

// Runs a promise that should fail with a Postgres error and returns its code.
// Drizzle wraps driver errors, so the code is on the cause.
export async function pgErrorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return cause?.code ?? (error as { code?: string }).code ?? "unknown";
  }
  throw new Error("Expected a database error, but the query succeeded.");
}
