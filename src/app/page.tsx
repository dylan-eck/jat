import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/queries";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        Job Application Tracker
      </h1>
      <Suspense
        fallback={<p className="text-muted-foreground">Loading account…</p>}
      >
        <Account />
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
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
