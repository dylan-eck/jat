import { and, asc, eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeUser } from "@/features/stages/initialize";
import { applicationEvents, applications, stages } from "@/lib/db/schema";
import { createTestUser, db, deleteTestUsers, pgErrorCode } from "@/test/db";
import { createApplication } from "./actions";
import { getApplication, listApplications } from "./queries";

// The action and query read the signed-in user from the session; tests set
// it directly.
const session = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/features/auth/queries", () => ({
  requireUser: async () => ({ id: session.userId, email: undefined }),
}));
vi.mock("next/cache", () => ({ refresh: () => {} }));

afterEach(deleteTestUsers);

async function signedInUser() {
  const userId = await createTestUser();
  await initializeUser(db, userId);
  session.userId = userId;
  return userId;
}

async function stageId(userId: string, name: string) {
  const [stage] = await db
    .select({ id: stages.id })
    .from(stages)
    .where(and(eq(stages.userId, userId), eq(stages.name, name)));
  if (!stage) {
    throw new Error(`No stage ${name}`);
  }
  return stage.id;
}

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

function applicationsOf(userId: string) {
  return db.select().from(applications).where(eq(applications.userId, userId));
}

function eventsOf(applicationId: string) {
  return db
    .select()
    .from(applicationEvents)
    .where(eq(applicationEvents.applicationId, applicationId))
    .orderBy(asc(applicationEvents.id));
}

// Inserts an application directly, as another user's existing data.
async function insertApplication(
  userId: string,
  stage: string,
  values: Partial<typeof applications.$inferInsert> = {},
) {
  const [row] = await db
    .insert(applications)
    .values({
      userId,
      company: "Acme",
      roleTitle: "Developer",
      stageId: await stageId(userId, stage),
      ...values,
    })
    .returning();
  if (!row) {
    throw new Error("Insert returned no row");
  }
  return row;
}

describe("createApplication", () => {
  it("creates an active application with only the required fields and records its initial stage", async () => {
    const userId = await signedInUser();
    const wishlist = await stageId(userId, "Wishlist");

    const result = await createApplication(
      null,
      form({ company: " Acme ", roleTitle: "Developer", stageId: wishlist }),
    );

    expect(result).toEqual({ ok: true });
    const [created, ...rest] = await applicationsOf(userId);
    expect(rest).toHaveLength(0);
    expect(created).toMatchObject({
      company: "Acme",
      roleTitle: "Developer",
      postingUrl: null,
      appliedOn: null,
      stageId: wishlist,
      status: "active",
      closeReason: null,
    });
    expect(await eventsOf(created?.id ?? "")).toMatchObject([
      {
        userId,
        fromStageName: null,
        toStageName: "Wishlist",
        fromStatus: null,
        toStatus: "active",
        closeReason: null,
      },
    ]);
  });

  it("saves the optional posting URL and date applied", async () => {
    const userId = await signedInUser();

    await createApplication(
      null,
      form({
        company: "Acme",
        roleTitle: "Developer",
        stageId: await stageId(userId, "Applied"),
        postingUrl: "https://acme.example/jobs/1",
        appliedOn: "2026-10-18",
      }),
    );

    expect(await applicationsOf(userId)).toMatchObject([
      { postingUrl: "https://acme.example/jobs/1", appliedOn: "2026-10-18" },
    ]);
  });

  it("returns field errors and saves nothing for invalid input", async () => {
    const userId = await signedInUser();

    const result = await createApplication(
      null,
      form({
        company: "",
        roleTitle: "Developer",
        stageId: await stageId(userId, "Wishlist"),
        postingUrl: "javascript:alert(1)",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        company: ["Company is required."],
        postingUrl: ["Enter a full http:// or https:// URL."],
      },
    });
    expect(await applicationsOf(userId)).toHaveLength(0);
  });

  it("rejects another user's stage without saving anything", async () => {
    const other = await signedInUser();
    const othersStage = await stageId(other, "Wishlist");
    const userId = await signedInUser();

    const result = await createApplication(
      null,
      form({ company: "Acme", roleTitle: "Developer", stageId: othersStage }),
    );

    expect(result).toEqual({
      ok: false,
      formError: "Invalid stage or document. Reload the page and try again.",
    });
    expect(await applicationsOf(userId)).toHaveLength(0);
    expect(await applicationsOf(other)).toHaveLength(0);
  });
});

describe("listApplications", () => {
  it("lists only the signed-in user's applications, newest first, with stage names", async () => {
    const other = await signedInUser();
    await insertApplication(other, "Wishlist");
    const userId = await signedInUser();
    const first = await insertApplication(userId, "Wishlist");
    const second = await insertApplication(userId, "Applied");

    const list = await listApplications();

    expect(list.map((a) => [a.id, a.stageName])).toEqual([
      [second.id, "Applied"],
      [first.id, "Wishlist"],
    ]);
  });

  describe("sorting", () => {
    // Inserted oldest first: beta, alpha, Gamma.
    async function threeApplications() {
      const userId = await signedInUser();
      await insertApplication(userId, "Interviewing", {
        company: "beta",
        roleTitle: "Designer",
        appliedOn: "2026-10-01",
      });
      await insertApplication(userId, "Wishlist", {
        company: "alpha",
        roleTitle: "engineer",
        status: "closed",
      });
      await insertApplication(userId, "Applied", {
        company: "Gamma",
        roleTitle: "Analyst",
        appliedOn: "2026-09-15",
      });
    }

    async function companies(order: Parameters<typeof listApplications>[0]) {
      return (await listApplications(order)).map((a) => a.company);
    }

    it.each([
      ["company", "asc", ["alpha", "beta", "Gamma"]],
      ["company", "desc", ["Gamma", "beta", "alpha"]],
      ["role_title", "asc", ["Gamma", "beta", "alpha"]],
      ["stage", "asc", ["alpha", "Gamma", "beta"]],
      ["stage", "desc", ["beta", "Gamma", "alpha"]],
      ["status", "asc", ["Gamma", "beta", "alpha"]],
      ["status", "desc", ["alpha", "Gamma", "beta"]],
      ["applied_on", "asc", ["Gamma", "beta", "alpha"]],
      ["applied_on", "desc", ["beta", "Gamma", "alpha"]],
    ] as const)("sorts by %s %s", async (sort, dir, expected) => {
      await threeApplications();
      expect(await companies({ sort, dir })).toEqual(expected);
    });

    it("lists the newest first without a sort column", async () => {
      await threeApplications();
      expect(await companies({ dir: "desc" })).toEqual([
        "Gamma",
        "alpha",
        "beta",
      ]);
    });
  });
});

describe("getApplication", () => {
  it("returns the signed-in user's application with its stage name", async () => {
    const userId = await signedInUser();
    const application = await insertApplication(userId, "Applied", {
      notes: "Referred by Sam",
    });

    expect(await getApplication(application.id)).toMatchObject({
      id: application.id,
      company: "Acme",
      stageName: "Applied",
      status: "active",
      notes: "Referred by Sam",
    });
  });

  it("returns null for another user's application", async () => {
    const other = await signedInUser();
    const application = await insertApplication(other, "Wishlist");
    await signedInUser();

    expect(await getApplication(application.id)).toBeNull();
  });

  it.each([
    ["an unknown id", "6f1c2d1e-8a4b-4c3d-9e2f-1a2b3c4d5e6f"],
    ["a malformed id", "not-a-uuid"],
  ])("returns null for %s", async (_, id) => {
    await signedInUser();
    expect(await getApplication(id)).toBeNull();
  });
});

describe("application constraints", () => {
  it.each([
    ["an empty company", { company: "" }],
    ["a role title over 200 characters", { roleTitle: "x".repeat(201) }],
    ["a javascript: posting URL", { postingUrl: "javascript:alert(1)" }],
    ["a close reason while active", { closeReason: "rejected" as const }],
  ])("rejects %s (23514)", async (_, values) => {
    const userId = await createTestUser();
    await initializeUser(db, userId);

    const code = await pgErrorCode(
      db.insert(applications).values({
        userId,
        company: "Acme",
        roleTitle: "Developer",
        stageId: await stageId(userId, "Wishlist"),
        ...values,
      }),
    );
    expect(code).toBe("23514");
  });

  it("rejects moving an application into another user's stage (23503)", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await Promise.all([initializeUser(db, a), initializeUser(db, b)]);
    const application = await insertApplication(a, "Wishlist");

    const code = await pgErrorCode(
      db
        .update(applications)
        .set({ stageId: await stageId(b, "Wishlist") })
        .where(eq(applications.id, application.id)),
    );
    expect(code).toBe("23503");
  });

  // on delete restrict raises restrict_violation, not foreign_key_violation.
  it("rejects deleting a stage that an application uses (23001)", async () => {
    const userId = await createTestUser();
    await initializeUser(db, userId);
    const application = await insertApplication(userId, "Wishlist");

    const code = await pgErrorCode(
      db.delete(stages).where(eq(stages.id, application.stageId)),
    );
    expect(code).toBe("23001");
  });

  it("rejects history for another user's application (23503)", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await Promise.all([initializeUser(db, a), initializeUser(db, b)]);
    const application = await insertApplication(a, "Wishlist");

    const code = await pgErrorCode(
      db
        .insert(applicationEvents)
        .values({ userId: b, applicationId: application.id }),
    );
    expect(code).toBe("23503");
  });

  it("keeps history stage names when a stage is renamed", async () => {
    const userId = await signedInUser();
    const wishlist = await stageId(userId, "Wishlist");
    await createApplication(
      null,
      form({ company: "Acme", roleTitle: "Developer", stageId: wishlist }),
    );

    await db
      .update(stages)
      .set({ name: "Someday" })
      .where(eq(stages.id, wishlist));

    const [application] = await applicationsOf(userId);
    expect(await eventsOf(application?.id ?? "")).toMatchObject([
      { toStageName: "Wishlist" },
    ]);
  });

  it("removes a user's applications and history when the user is deleted", async () => {
    const userId = await createTestUser();
    await initializeUser(db, userId);
    const application = await insertApplication(userId, "Wishlist");
    await db.insert(applicationEvents).values({
      userId,
      applicationId: application.id,
      toStageName: "Wishlist",
    });

    await deleteTestUsers();

    expect(await applicationsOf(userId)).toHaveLength(0);
    expect(await eventsOf(application.id)).toHaveLength(0);
  });
});
