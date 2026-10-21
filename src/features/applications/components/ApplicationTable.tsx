import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
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
import { headerOrder, type OverviewOrder, type SortColumn } from "../schema";

const columns: { key: SortColumn; label: string }[] = [
  { key: "company", label: "Company" },
  { key: "role_title", label: "Role" },
  { key: "stage", label: "Stage" },
  { key: "status", label: "Status" },
  { key: "applied_on", label: "Date applied" },
];

// A table from md up; stacked rows below md (US-19). Resume and next action
// columns arrive with documents and follow-ups (US-13, US-15).
export function ApplicationTable({
  applications,
  order,
}: {
  applications: ApplicationListItem[];
  order: OverviewOrder;
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
                <SortableHead key={column.key} column={column} order={order} />
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

function SortableHead({
  column,
  order,
}: {
  column: { key: SortColumn; label: string };
  order: OverviewOrder;
}) {
  const active = order.sort === column.key;
  const Icon = !active
    ? ArrowUpDown
    : order.dir === "asc"
      ? ArrowUp
      : ArrowDown;
  return (
    <TableHead
      aria-sort={
        active ? (order.dir === "asc" ? "ascending" : "descending") : undefined
      }
    >
      <Link
        href={{ pathname: "/", query: headerOrder(column.key, order) }}
        scroll={false}
        className="-mx-2 inline-flex items-center gap-1 rounded-md px-2 py-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {column.label}
        <Icon
          aria-hidden
          className={active ? "size-3.5" : "size-3.5 text-muted-foreground"}
        />
      </Link>
    </TableHead>
  );
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
