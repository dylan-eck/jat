import { Suspense } from "react";
import { ApplicationList } from "@/features/applications/components/ApplicationList";
import { NewApplicationDialog } from "@/features/applications/components/NewApplicationDialog";
import { listApplications } from "@/features/applications/queries";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { requireUser } from "@/features/auth/queries";
import { listStages } from "@/features/stages/queries";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Job Application Tracker
      </h1>
      <Suspense
        fallback={<p className="text-muted-foreground">Loading account…</p>}
      >
        <Account />
      </Suspense>
      <Suspense
        fallback={
          <p className="text-muted-foreground">Loading applications…</p>
        }
      >
        <Overview />
      </Suspense>
    </main>
  );
}

async function Account() {
  const user = await requireUser();
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-muted-foreground">
        Signed in as{" "}
        <span className="font-medium text-foreground">{user.email}</span>
      </p>
      <SignOutButton />
    </div>
  );
}

async function Overview() {
  const [applications, stages] = await Promise.all([
    listApplications(),
    listStages(),
  ]);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Applications</h2>
        <NewApplicationDialog stages={stages} />
      </div>
      <ApplicationList applications={applications} />
    </section>
  );
}
