import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApplicationDetails } from "@/features/applications/components/ApplicationDetails";
import { getApplication } from "@/features/applications/queries";

export default function ApplicationPage({
  params,
}: PageProps<"/applications/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <BackLink />
      <Suspense
        fallback={<p className="text-muted-foreground">Loading application…</p>}
      >
        <Application params={params} />
      </Suspense>
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-4" />
      All applications
    </Link>
  );
}

async function Application({
  params,
}: Pick<PageProps<"/applications/[id]">, "params">) {
  const { id } = await params;
  const application = await getApplication(id);
  if (!application) {
    notFound();
  }
  return <ApplicationDetails application={application} />;
}
