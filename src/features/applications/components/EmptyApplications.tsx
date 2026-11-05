import type { StageOption } from "@/features/stages/queries";
import { NewApplicationDialog } from "./NewApplicationDialog";

export function EmptyApplications({ stages }: { stages: StageOption[] }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed px-6 py-12 text-center">
      <p className="font-medium">No applications yet</p>
      <p className="text-sm text-muted-foreground">
        Add a job you've applied to, or one you're thinking about.
      </p>
      <NewApplicationDialog stages={stages} variant="link">
        Add your first application
      </NewApplicationDialog>
    </div>
  );
}
