import type { applicationEvents, applications } from "@/lib/db/schema";

export type HistoryState = Pick<
  typeof applications.$inferSelect,
  "stageId" | "status" | "closeReason"
>;

export type HistoryEvent = Pick<
  typeof applicationEvents.$inferInsert,
  "fromStageName" | "toStageName" | "fromStatus" | "toStatus" | "closeReason"
>;

// The history entry for a change from `before` to `after`, or null when the
// stage, status, and close reason are all unchanged. `before` is null on
// create. Stage names are snapshotted, so later renames don't rewrite history.
export function eventFor(
  before: HistoryState | null,
  after: HistoryState,
  stageNames: ReadonlyMap<string, string>,
): HistoryEvent | null {
  if (
    before &&
    before.stageId === after.stageId &&
    before.status === after.status &&
    before.closeReason === after.closeReason
  ) {
    return null;
  }
  return {
    fromStageName: before ? (stageNames.get(before.stageId) ?? null) : null,
    toStageName: stageNames.get(after.stageId) ?? null,
    fromStatus: before?.status ?? null,
    toStatus: after.status,
    closeReason: after.closeReason,
  };
}
