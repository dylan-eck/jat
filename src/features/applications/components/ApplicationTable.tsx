import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { closeReasonLabels, formatDate, statusLabels } from "../format";
import type { ApplicationListItem } from "../queries";

const columns = ["Company", "Role", "Stage", "Status", "Date applied"];

// A table from md up; stacked rows below md (US-19). Resume and next action
// columns arrive with documents and follow-ups (US-13, US-15).
export function ApplicationTable({
  applications,
}: {
  applications: ApplicationListItem[];
}) {
  return (
    <>
      <ul className="divide-y rounded-lg border md:hidden">
        {applications.map((application) => (
          <li key={application.id}>
            <Link
              href={applicationHref(application.id)}
              className="flex flex-col gap-1 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="truncate font-medium">
                {application.company}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {application.roleTitle}
              </span>
              <span className="text-sm text-muted-foreground">
                {application.stageName} · <Status application={application} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              // The company link stretches over the whole row, so clicking
              // anywhere opens the application.
              <TableRow
                key={application.id}
                className="relative has-focus-visible:bg-muted/50"
              >
                <TableCell className="font-medium">
                  <Link
                    href={applicationHref(application.id)}
                    className="outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                  >
                    <span className="block max-w-56 truncate">
                      {application.company}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="block max-w-56 truncate">
                    {application.roleTitle}
                  </span>
                </TableCell>
                <TableCell>{application.stageName}</TableCell>
                <TableCell>
                  <Status application={application} />
                </TableCell>
                <TableCell>
                  {application.appliedOn ? (
                    formatDate(application.appliedOn)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function applicationHref(id: string) {
  return `/applications/${id}`;
}

function Status({
  application,
}: {
  application: Pick<ApplicationListItem, "status" | "closeReason">;
}) {
  const { status, closeReason } = application;
  return (
    <>
      {statusLabels[status]}
      {closeReason ? ` · ${closeReasonLabels[closeReason]}` : null}
    </>
  );
}
