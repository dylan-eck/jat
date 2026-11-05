import type { ReactNode } from "react";
import {
  closeReasonLabels,
  formatDate,
  statusLabels,
  workArrangementLabels,
} from "../format";
import type { ApplicationDetail } from "../queries";

// Read-only for now; editing arrives with US-6.
export function ApplicationDetails({
  application,
}: {
  application: ApplicationDetail;
}) {
  const { closeReason, workArrangement } = application;
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight break-words">
          {application.company}
        </h1>
        <p className="text-lg text-muted-foreground break-words">
          {application.roleTitle}
        </p>
      </header>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label="Stage">{application.stageName}</Field>
        <Field label="Status">
          {statusLabels[application.status]}
          {closeReason ? ` · ${closeReasonLabels[closeReason]}` : null}
        </Field>
        <Field label="Date applied">
          {application.appliedOn ? formatDate(application.appliedOn) : null}
        </Field>
        <Field label="Job posting">
          {application.postingUrl ? (
            // Only http(s) URLs can be stored (Zod and a check constraint).
            <a
              href={application.postingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all underline underline-offset-4"
            >
              {application.postingUrl}
            </a>
          ) : null}
        </Field>
        <Field label="Location">{application.location}</Field>
        <Field label="Work arrangement">
          {workArrangement ? workArrangementLabels[workArrangement] : null}
        </Field>
        <Field label="Salary">{application.salary}</Field>
        <Field label="Contact">{application.contact}</Field>
        <Field label="Notes" wide>
          {application.notes ? (
            <span className="whitespace-pre-wrap">{application.notes}</span>
          ) : null}
        </Field>
      </dl>
    </article>
  );
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        wide ? "flex flex-col gap-1 sm:col-span-2" : "flex flex-col gap-1"
      }
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words">
        {children ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
