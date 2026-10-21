import "server-only";
import type { Db } from "@/lib/db/client";
import { profiles, stages } from "@/lib/db/schema";

export const defaultStageNames = [
  "Wishlist",
  "Applied",
  "Interviewing",
  "Offer",
] as const;

// Creates a user's profile and default stages on first sign-in (US-1).
// Idempotent: stages are only added in the same transaction that creates the
// profile, so later sign-ins (or a concurrent one) change nothing.
//
// Not a Server Action: it takes a user id, so it must only be called with the
// id of the verified signed-in user.
export async function initializeUser(db: Db, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const created = await tx
      .insert(profiles)
      .values({ userId })
      .onConflictDoNothing()
      .returning({ userId: profiles.userId });
    if (created.length === 0) {
      return;
    }
    await tx
      .insert(stages)
      .values(
        defaultStageNames.map((name, position) => ({ userId, name, position })),
      );
  });
}
