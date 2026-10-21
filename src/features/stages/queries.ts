import "server-only";
import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/features/auth/queries";
import { db } from "@/lib/db/client";
import { stages } from "@/lib/db/schema";

export type StageOption = { id: string; name: string };

export async function listStages(): Promise<StageOption[]> {
  const user = await requireUser();
  return db
    .select({ id: stages.id, name: stages.name })
    .from(stages)
    .where(eq(stages.userId, user.id))
    .orderBy(asc(stages.position));
}
