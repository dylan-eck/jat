import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/features/auth/queries";
import { db } from "@/lib/db/client";
import { applications, stages } from "@/lib/db/schema";

// Minimal list for the overview until the full table lands (#10).
export async function listApplications() {
  const user = await requireUser();
  return db
    .select({
      id: applications.id,
      company: applications.company,
      roleTitle: applications.roleTitle,
      status: applications.status,
      stageName: stages.name,
    })
    .from(applications)
    .innerJoin(stages, eq(stages.id, applications.stageId))
    .where(eq(applications.userId, user.id))
    .orderBy(desc(applications.createdAt), desc(applications.id));
}

export type ApplicationListItem = Awaited<
  ReturnType<typeof listApplications>
>[number];

// Returns null for a malformed id, a missing row, or another user's row, so
// callers can't tell them apart.
export async function getApplication(id: string) {
  const user = await requireUser();
  if (!z.uuid().safeParse(id).success) {
    return null;
  }
  const [application] = await db
    .select({
      id: applications.id,
      company: applications.company,
      roleTitle: applications.roleTitle,
      postingUrl: applications.postingUrl,
      appliedOn: applications.appliedOn,
      status: applications.status,
      closeReason: applications.closeReason,
      stageName: stages.name,
      location: applications.location,
      workArrangement: applications.workArrangement,
      salary: applications.salary,
      contact: applications.contact,
      notes: applications.notes,
    })
    .from(applications)
    .innerJoin(stages, eq(stages.id, applications.stageId))
    .where(and(eq(applications.id, id), eq(applications.userId, user.id)));
  return application ?? null;
}

export type ApplicationDetail = NonNullable<
  Awaited<ReturnType<typeof getApplication>>
>;
