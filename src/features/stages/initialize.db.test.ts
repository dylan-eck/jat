import { asc, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { profiles, stages } from "@/lib/db/schema";
import { createTestUser, db, deleteTestUsers, pgErrorCode } from "@/test/db";
import { defaultStageNames, initializeUser } from "./initialize";

afterEach(deleteTestUsers);

function stagesOf(userId: string) {
  return db
    .select({ name: stages.name, position: stages.position })
    .from(stages)
    .where(eq(stages.userId, userId))
    .orderBy(asc(stages.position));
}

describe("initializeUser", () => {
  it("creates a profile with defaults and the four default stages in order", async () => {
    const userId = await createTestUser();

    await initializeUser(db, userId);

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));
    expect(profile).toEqual({ userId, timeZone: null, staleAfterDays: 14 });
    expect(await stagesOf(userId)).toEqual(
      defaultStageNames.map((name, position) => ({ name, position })),
    );
  });

  it("does nothing for a user who already has a profile", async () => {
    const userId = await createTestUser();
    await initializeUser(db, userId);
    await db.delete(stages).where(eq(stages.userId, userId));

    await initializeUser(db, userId);

    // A user who deleted their stages doesn't get the defaults back.
    expect(await stagesOf(userId)).toHaveLength(0);
  });

  it("gives each user their own stages", async () => {
    const a = await createTestUser();
    const b = await createTestUser();

    await Promise.all([initializeUser(db, a), initializeUser(db, b)]);

    expect(await stagesOf(a)).toHaveLength(4);
    expect(await stagesOf(b)).toHaveLength(4);
  });
});

describe("profile and stage constraints", () => {
  it("rejects a stage name that differs only in case (23505)", async () => {
    const userId = await createTestUser();
    await initializeUser(db, userId);

    const code = await pgErrorCode(
      db.insert(stages).values({ userId, name: "APPLIED", position: 9 }),
    );
    expect(code).toBe("23505");
  });

  it("allows the same stage name for different users", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await initializeUser(db, a);

    await initializeUser(db, b);

    expect(await stagesOf(b)).toHaveLength(4);
  });

  it.each([0, 366])(
    "rejects stale_after_days = %i (23514)",
    async (staleAfterDays) => {
      const userId = await createTestUser();
      await initializeUser(db, userId);

      const code = await pgErrorCode(
        db
          .update(profiles)
          .set({ staleAfterDays })
          .where(eq(profiles.userId, userId)),
      );
      expect(code).toBe("23514");
    },
  );

  it.each(["", "x".repeat(51)])(
    "rejects a stage name of length %#",
    async (name) => {
      const userId = await createTestUser();

      const code = await pgErrorCode(
        db.insert(stages).values({ userId, name, position: 0 }),
      );
      expect(code).toBe("23514");
    },
  );

  it("removes a user's profile and stages when the user is deleted", async () => {
    const userId = await createTestUser();
    await initializeUser(db, userId);

    await deleteTestUsers();

    expect(await stagesOf(userId)).toHaveLength(0);
  });
});
