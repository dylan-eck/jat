"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { type SignOutState, signOut } from "../actions";

const initialState: SignOutState = { status: "idle" };

export function SignOutButton() {
  const [state, formAction, pending] = useActionState(signOut, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
