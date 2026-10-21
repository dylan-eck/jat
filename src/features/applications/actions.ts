"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { requireUser } from "@/features/auth/queries";
import {
  type ActionResult,
  invalidInput,
  mapPostgresError,
} from "@/lib/action-result";
import { db } from "@/lib/db/client";
import { applicationEvents, applications, stages } from "@/lib/db/schema";
import { eventFor } from "./history";
import { createApplicationSchema } from "./schema";

export async function createApplication(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = createApplicationSchema.safeParse({
    company: formData.get("company"),
    roleTitle: formData.get("roleTitle"),
    postingUrl: formData.get("postingUrl"),
    appliedOn: formData.get("appliedOn"),
    stageId: formData.get("stageId"),
  });
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  // The composite stage FK rejects another user's stage id (23503), so the
  // stage lookup below only ever finds the user's own stage.
  try {
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(applications)
        .values({ ...parsed.data, userId: user.id })
        .returning();
      if (!created) {
        throw new Error("Insert returned no row");
      }
      const [stage] = await tx
        .select({ name: stages.name })
        .from(stages)
        .where(and(eq(stages.id, created.stageId), eq(stages.userId, user.id)));
      const event = eventFor(
        null,
        created,
        new Map(stage ? [[created.stageId, stage.name]] : []),
      );
      if (event) {
        await tx
          .insert(applicationEvents)
          .values({ ...event, userId: user.id, applicationId: created.id });
      }
    });
  } catch (error) {
    console.error("createApplication failed", error);
    return mapPostgresError(error);
  }

  refresh();
  return { ok: true };
}
