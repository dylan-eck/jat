"use client";

import {
  type FormEvent,
  type ReactNode,
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StageOption } from "@/features/stages/queries";
import { createApplication } from "../actions";

export function NewApplicationDialog({ stages }: { stages: StageOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New application</DialogTrigger>
      {/* Full-screen sheet below md, centered dialog from md up. */}
      <DialogContent className="inset-0 top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none sm:max-w-none md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl">
        <DialogHeader>
          <DialogTitle>New application</DialogTitle>
          <DialogDescription>
            Only company and role title are required. Add the rest later.
          </DialogDescription>
        </DialogHeader>
        <NewApplicationForm stages={stages} onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function NewApplicationForm({
  stages,
  onCreated,
}: {
  stages: StageOption[];
  onCreated: () => void;
}) {
  const [state, formAction, pending] = useActionState(createApplication, null);

  useEffect(() => {
    if (state?.ok) {
      onCreated();
    }
  }, [state, onCreated]);

  // Submitting through a transition instead of <form action> keeps the
  // entered values when the server returns errors (React resets forms
  // after an action prop runs).
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state?.ok === false ? state.fieldErrors : undefined;
  const formError = state?.ok === false ? state.formError : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field id="company" label="Company" error={errors?.company?.[0]}>
        <Input
          id="company"
          name="company"
          required
          maxLength={200}
          autoComplete="organization"
          aria-invalid={errors?.company ? true : undefined}
          aria-describedby="company-error"
        />
      </Field>
      <Field id="roleTitle" label="Role title" error={errors?.roleTitle?.[0]}>
        <Input
          id="roleTitle"
          name="roleTitle"
          required
          maxLength={200}
          aria-invalid={errors?.roleTitle ? true : undefined}
          aria-describedby="roleTitle-error"
        />
      </Field>
      <Field id="stageId" label="Stage" error={errors?.stageId?.[0]}>
        <select
          id="stageId"
          name="stageId"
          defaultValue={stages[0]?.id}
          aria-invalid={errors?.stageId ? true : undefined}
          aria-describedby="stageId-error"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="postingUrl"
        label="Job posting URL"
        error={errors?.postingUrl?.[0]}
      >
        <Input
          id="postingUrl"
          name="postingUrl"
          type="url"
          inputMode="url"
          placeholder="https://"
          aria-invalid={errors?.postingUrl ? true : undefined}
          aria-describedby="postingUrl-error"
        />
      </Field>
      <Field id="appliedOn" label="Date applied" error={errors?.appliedOn?.[0]}>
        <Input
          id="appliedOn"
          name="appliedOn"
          type="date"
          aria-invalid={errors?.appliedOn ? true : undefined}
          aria-describedby="appliedOn-error"
        />
      </Field>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save application"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <p
        id={`${id}-error`}
        aria-live="polite"
        className="text-sm text-destructive empty:hidden"
      >
        {error}
      </p>
    </div>
  );
}
