"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type MagicLinkState,
  sendMagicLink,
  signInWithGitHub,
} from "../actions";

const initialState: MagicLinkState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState,
  );

  if (state.status === "sent") {
    return (
      <p aria-live="polite" className="text-sm">
        Check <span className="font-medium">{state.email}</span> for a sign-in
        link. Open it in this browser.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state.status === "error" || undefined}
          aria-describedby="email-error"
        />
        <p
          id="email-error"
          aria-live="polite"
          className="min-h-5 text-sm text-destructive"
        >
          {state.status === "error" ? state.message : null}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send magic link"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGitHub}>
        <Button type="submit" variant="outline" className="w-full">
          Continue with GitHub
        </Button>
      </form>
    </div>
  );
}
