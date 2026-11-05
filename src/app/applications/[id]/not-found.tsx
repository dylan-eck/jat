import Link from "next/link";

// Also shown for another user's application, so it never reveals that one
// exists.
export default function ApplicationNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Application not found
      </h1>
      <p className="text-muted-foreground">
        It may have been deleted, or the link is wrong.
      </p>
      <Link
        href="/"
        className="self-start text-sm underline underline-offset-4"
      >
        Back to all applications
      </Link>
    </main>
  );
}
