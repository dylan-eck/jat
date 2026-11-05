import "server-only";
import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/features/auth/queries";
import { db } from "@/lib/db/client";
import { applications, stages } from "@/lib/db/schema";
import type { OverviewOrder, SortColumn } from "./schema";

// Text sorts ignore case, and stages sort in the user's stage order rather
// than by name.
const sortExpressions: Record<SortColumn, SQL> = {
  company: sql`lower(${applications.company})`,
  role_title: sql`lower(${applications.roleTitle})`,
  stage: sql`${stages.position}`,
  status: sql`${applications.status}`,
  applied_on: sql`${applications.appliedOn}`,
};

// Rows without a value (no date applied yet) go last in both directions.
// Ties, and the default order, put the newest applications first.
function orderBy({ sort, dir }: OverviewOrder): SQL[] {
  const newestFirst = [desc(applications.createdAt), desc(applications.id)];
  if (!sort) {
    return newestFirst;
  }
  const expression = sortExpressions[sort];
  return [
    dir === "asc"
      ? sql`${expression} asc nulls last`
      : sql`${expression} desc nulls last`,
    ...newestFirst,
  ];
}

export async function listApplications(order: OverviewOrder = { dir: "asc" }) {
  const user = await requireUser();
  return db
    .select({
      id: applications.id,
      company: applications.company,
      roleTitle: applications.roleTitle,
      status: applications.status,
      closeReason: applications.closeReason,
      appliedOn: applications.appliedOn,
      stageName: stages.name,
    })
    .from(applications)
    .innerJoin(stages, eq(stages.id, applications.stageId))
    .where(eq(applications.userId, user.id))
    .orderBy(...orderBy(order));
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
