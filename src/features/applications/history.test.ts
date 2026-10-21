import { describe, expect, it } from "vitest";
import { eventFor, type HistoryState } from "./history";

const stageNames = new Map([
  ["s1", "Wishlist"],
  ["s2", "Applied"],
]);

const wishlist: HistoryState = {
  stageId: "s1",
  status: "active",
  closeReason: null,
};

describe("eventFor", () => {
  it("records the initial stage and status on create", () => {
    expect(eventFor(null, wishlist, stageNames)).toEqual({
      fromStageName: null,
      toStageName: "Wishlist",
      fromStatus: null,
      toStatus: "active",
      closeReason: null,
    });
  });

  it("records a stage change with both names", () => {
    expect(
      eventFor(wishlist, { ...wishlist, stageId: "s2" }, stageNames),
    ).toMatchObject({ fromStageName: "Wishlist", toStageName: "Applied" });
  });

  it("records closing with its reason", () => {
    expect(
      eventFor(
        wishlist,
        { ...wishlist, status: "closed", closeReason: "ghosted" },
        stageNames,
      ),
    ).toMatchObject({
      fromStatus: "active",
      toStatus: "closed",
      closeReason: "ghosted",
    });
  });

  it("returns null when nothing tracked changed", () => {
    expect(eventFor(wishlist, { ...wishlist }, stageNames)).toBeNull();
  });
});
