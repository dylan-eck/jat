import type {
  applicationStatus,
  closeReason,
  workArrangement,
} from "@/lib/db/schema";

export const statusLabels = {
  active: "Active",
  closed: "Closed",
} satisfies Record<(typeof applicationStatus.enumValues)[number], string>;

export const closeReasonLabels = {
  accepted_offer: "Accepted offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
} satisfies Record<(typeof closeReason.enumValues)[number], string>;

export const workArrangementLabels = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
} satisfies Record<(typeof workArrangement.enumValues)[number], string>;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

// Date columns are calendar dates ("2026-10-18") with no time zone. Reading
// and formatting them as UTC keeps the day from shifting.
export function formatDate(value: string): string {
  return dateFormat.format(new Date(`${value}T00:00:00Z`));
}
