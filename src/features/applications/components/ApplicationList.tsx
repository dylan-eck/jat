import type { ApplicationListItem } from "../queries";

const statusLabels = { active: "Active", closed: "Closed" } as const;

// Minimal list so new applications are visible. The full table is #10.
export function ApplicationList({
  applications,
}: {
  applications: ApplicationListItem[];
}) {
  if (applications.length === 0) {
    return (
      <p className="text-muted-foreground">
        No applications yet. Add your first one to start tracking it.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {applications.map((application) => (
        <li
          key={application.id}
          className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{application.company}</p>
            <p className="truncate text-sm text-muted-foreground">
              {application.roleTitle}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {application.stageName} · {statusLabels[application.status]}
          </p>
        </li>
      ))}
    </ul>
  );
}
