import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { loginErrorMessage } from "@/features/auth/redirect";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            New here? Signing in creates your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Suspense>
            <LoginError searchParams={searchParams} />
          </Suspense>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}

async function LoginError({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  const message = loginErrorMessage(error);
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
