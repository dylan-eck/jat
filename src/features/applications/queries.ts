import "server-only";
import { desc, eq } from "drizzle-orm";
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
