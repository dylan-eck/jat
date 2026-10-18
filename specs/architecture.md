# jat: Architecture Spec

How the product in [`product.md`](./product.md) is built. Stack and repo
conventions live in [`AGENTS.md`](../AGENTS.md). This document covers the
decisions on top of those.

## Principles

1. **The database is the source of truth for rules.** Ownership, referential
   rules, stage history, and activity tracking are enforced in Postgres
   (RLS, constraints, triggers). Server Actions validate input and give
   friendly errors, but a buggy action can't break an invariant.
2. **Every read and write runs as the user.** The app only uses the
   publishable key with the user's session. No service-role key in the
   Next.js app, so RLS applies to every query.
3. **Server-first UI.** Pages are Server Components that read through
   `queries.ts`. Client Components exist only for interactivity (forms,
   filters, uploads).
4. **Pure logic is pulled out and unit-tested.** Date math, CSV encoding,
   reminder/stale rules, and error mapping are plain functions with Vitest
   tests. Database behavior is tested with pgTAP.

## System overview

```
Browser ──► Next.js on Vercel ─────────────► Supabase
  │          proxy.ts (session refresh,        Postgres (RLS, triggers)
  │                    optimistic redirect)    Auth (magic link, GitHub)
  │          Server Components → queries.ts    Storage (private "documents"
  │          Server Actions    → actions.ts             bucket, RLS)
  │          Route Handlers (CSV, file links)
  └──────── direct PDF upload ───────────────► Storage
```

PDFs go from the browser straight to Storage (see [Documents](#documents)).
Everything else goes through Next.js.

## Routes

| Route | Kind | Purpose | Stories |
|---|---|---|---|
| `/` | page | Overview table, filters, reminders, new application form | US-3, 4, 5, 16, 17 |
| `/applications/[id]` | page | Detail view, edit form, history, interviews | US-6–9, 11, 13, 15 |
| `/documents` | page | Document library | US-12, 14 |
| `/documents/[id]/file` | route handler | Redirects to a short-lived signed URL | US-12 |
| `/settings` | page | Stages, stale threshold, time zone | US-10, 17 |
| `/export` | route handler | CSV download | US-18 |
| `/login`, `/auth/callback` | existing | Sign-in | US-1 |

Overview filters and sorting live in the URL (`?status=active&stage=…&sort=applied_on&dir=desc`).
They are parsed with Zod in the page and applied in the SQL query. The
defaults (`status=active`) apply when a param is absent, so a bare `/` shows
active applications.

## Code layout

Follows the AGENTS.md layout. Planned feature modules:

| Module | Owns |
|---|---|
| `src/features/applications/` | Application CRUD, overview query, history query |
| `src/features/stages/` | Stage list, add/rename/reorder/delete |
| `src/features/interviews/` | Interview CRUD |
| `src/features/documents/` | Upload registration, rename, delete, signed URLs |
| `src/features/settings/` | Profile (time zone, stale threshold) |
| `src/features/reminders/` | Pure needs-attention / upcoming / stale logic |
| `src/features/export/` | CSV encoding |
| `src/lib/time.ts` | Time zone helpers (today in tz, local ↔ UTC) |
| `src/lib/action-result.ts` | Shared Server Action result type + Postgres error mapping |

## Data model

All tables live in `public`, have RLS enabled, and have a `user_id uuid not
null references auth.users on delete cascade`. Timestamps are `timestamptz`.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK | |
| `time_zone` | text, nullable | IANA name. Null until the browser reports it. Checked against `pg_timezone_names` |
| `stale_after_days` | int not null default 14 | `check (stale_after_days between 1 and 365)` |

### `stages`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text not null | 1–50 chars. Unique per user, case-insensitive |
| `position` | int not null | Display order |

`unique (id, user_id)` is the target of composite foreign keys.

### `documents`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `kind` | enum `document_kind` (`resume`, `cover_letter`) | Immutable |
| `name` | text not null | 1–100 chars. The only editable column |
| `storage_path` | text not null unique | `{user_id}/{uuid}.pdf`. Immutable |
| `size_bytes` | int not null | |

`unique (id, user_id, kind)` is the target of composite foreign keys.

### `applications`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `company`, `role_title` | text not null | 1–200 chars |
| `posting_url` | text | `http(s)://` only (no `javascript:` links) |
| `applied_on` | date | |
| `status` | enum (`active`, `closed`) not null default `active` | |
| `close_reason` | enum (`accepted_offer`, `rejected`, `withdrawn`, `ghosted`) | `check (status = 'closed' or close_reason is null)` |
| `stage_id` | uuid not null | FK `(stage_id, user_id) → stages (id, user_id) on delete restrict` |
| `resume_id` | uuid | FK `(resume_id, user_id, resume_kind) → documents (id, user_id, kind) on delete restrict` |
| `resume_kind` | `document_kind generated always as ('resume') stored` | Makes the FK enforce the document type |
| `cover_letter_id`, `cover_letter_kind` | same pattern | `'cover_letter'` |
| `location`, `salary`, `contact`, `notes` | text | Salary is free text ("120–150k USD") |
| `work_arrangement` | enum (`onsite`, `hybrid`, `remote`) | |
| `next_action` | text | |
| `next_action_due` | date | `check (next_action_due is null or next_action is not null)` |
| `last_activity_at` | timestamptz not null | Maintained by triggers only |
| `created_at`, `updated_at` | timestamptz | |

`unique (id, user_id)` is the target for interviews and history.

The composite foreign keys are how US-2's cross-user write criteria are met.
RLS only checks the row being written, so a plain `stage_id` FK would accept
another user's stage. Including `user_id` in the key makes that impossible.
Postgres ignores a composite FK when any of its columns is null
(`MATCH SIMPLE`), which is what keeps resume and cover letter optional.

### `interviews`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `application_id` | uuid not null | FK `(application_id, user_id) → applications (id, user_id) on delete cascade` |
| `name` | text not null | |
| `scheduled_at` | timestamptz not null | Stored in UTC |
| `interviewers`, `notes` | text | |
| `format` | enum (`phone`, `video`, `onsite`) | |
| `outcome` | enum (`pending`, `passed`, `failed`) not null default `pending` | |

### `application_events` (stage history)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `application_id` | uuid not null | FK `(application_id, user_id) → applications on delete cascade` |
| `occurred_at` | timestamptz not null default now() | |
| `from_stage_name`, `to_stage_name` | text | Snapshots, not FKs (product spec: history keeps old names) |
| `from_status`, `to_status` | status enum | |
| `close_reason` | close reason enum | |

Users can read this table but not write it: RLS allows select only, and
rows come from a trigger.

### Column privileges

Besides RLS, `authenticated` gets column-level `insert`/`update` grants only
on user-editable columns. `user_id` is set by a column default
(`auth.uid()`). `last_activity_at`, `created_at`, `documents.kind`, and
`documents.storage_path` can't be written directly at all, so these
invariants hold even if someone calls the Data API directly.

## Database-enforced rules

| Rule | Mechanism | Stories |
|---|---|---|
| Users see and change only their own rows | RLS `using / with check (user_id = (select auth.uid()))` on every table | US-2 |
| References point to the user's own stages/documents/applications | Composite FKs including `user_id` | US-2 |
| Resume/cover letter pickers can't take the wrong kind | Composite FK including generated `*_kind` column | US-13 |
| In-use stages and documents can't be deleted | `on delete restrict` | US-10, 14 |
| New users get a profile + default stages | `after insert on auth.users` trigger (security definer) | US-1 |
| Stage/status changes are recorded with name snapshots | `after insert or update of stage_id, status, close_reason on applications` trigger (security definer, writes `application_events`) | US-3, 6, 7, 8 |
| `last_activity_at` only moves on real changes | `before update` trigger on `applications`: compares `to_jsonb(new)` and `to_jsonb(old)` without `updated_at`/`last_activity_at`, bumps only if they differ. `after insert/update/delete` trigger on `interviews` bumps the parent (on update, only if the row changed) | US-17 |
| Stage reorders are atomic | `reorder_stages(ids uuid[])` RPC (security invoker) | US-10 |

"At least one stage must remain" is checked in the Server Action, not the
database. With zero stages nothing breaks, the user just can't create
applications, and a DB check would get in the way of cascading account
deletes.

Security definer functions use `set search_path = ''` and fully qualified
names, following Supabase guidance.

## Data flow

### Reads
- `queries.ts` functions call `requireUser()` (verified claims via
  `getClaims()`), then query with the server Supabase client. RLS does the
  filtering. Queries also filter by `user_id` explicitly so indexes are used.
- **No `use cache` for user data in v1.** User data always depends on the
  session cookie, and the volume per user is small, so every request reads
  fresh. Pages render a static shell and stream user data inside
  `<Suspense>`, following AGENTS.md. Revisit only if a page is measurably
  slow.

### Mutations
- Every Server Action follows the same steps: `requireUser()` → Zod
  `safeParse` → Supabase write → map errors → `refresh()` from
  `next/cache` (or `redirect()` after create or delete).
- All actions return the shared `ActionResult` type:
  `{ ok: true, data? } | { ok: false, fieldErrors?, formError? }`.
  Forms consume it with `useActionState`.
- Postgres errors are mapped in one place (`src/lib/action-result.ts`), e.g.:
  - `23503` FK violation on stage/document delete → "Used by N applications"
    (the action then queries which ones)
  - `23503` on insert/update → "Invalid stage or document", which also
    covers attempts to reference another user's rows
  - `23505` unique violation → "A stage with that name already exists"
- Reading another user's row returns no rows under RLS, so actions treat
  "0 rows affected" as not-found. They never reveal that the row exists.

## Time

- The time zone is stored on `profiles.time_zone`. On the first
  authenticated page load where it is null, a small Client Component sends
  `Intl.DateTimeFormat().resolvedOptions().timeZone` to a Server Action.
  Until then the server uses `UTC`. Users can change it in `/settings`.
- `src/lib/time.ts` wraps `@date-fns/tz` (no hand-written offset math):
  - `todayIn(tz, now)`: calendar date used for due/overdue
  - `localInputToUtc(value, tz)`: converts `<input type="datetime-local">`
    values to UTC on the server
  - `formatInTz(instant, tz)`: for display
- Every function takes `now` as a parameter so tests are deterministic.
- Rules from the product spec:
  - due today: `next_action_due = today`
  - overdue: `next_action_due < today`
  - upcoming interview: `now ≤ scheduled_at < now + 168h`
  - stale: `status = 'active' and last_activity_at < now − stale_after_days × 24h`

## Documents

**Upload goes directly from the browser to Storage**, not through a Server
Action. Server Actions default to a 1 MB body limit, and Vercel Functions cap
request bodies at 4.5 MB, so a 10 MB PDF can't go through Next.js.

1. A Client Component checks type and size up front (for UX only), then
   uploads with the browser Supabase client to
   `documents/{user_id}/{crypto.randomUUID()}.pdf` with `upsert: false`.
2. It calls the `createDocument({ path, name, kind })` Server Action. The
   action re-checks the user, checks that `path` starts with their id,
   confirms the object exists and is ≤ 10 MB, and inserts the `documents`
   row.
3. Upload from the application form (US-13) uses the same component, then
   selects the new document.

Storage is configured in a migration:
- Private bucket `documents`, `file_size_limit = 10MB`,
  `allowed_mime_types = ['application/pdf']`.
- `storage.objects` policies for select, insert, and delete where
  `bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text`.
- No update policy, so files can't be replaced after upload.

Viewing a file: `/documents/[id]/file` loads the row (RLS-scoped), creates a
60-second signed URL, and redirects to it. Signed URLs never end up in page
HTML.

Deleting a file: delete the row first (the FK blocks it if the document is
in use), then remove the object.

**Known gaps, accepted for v1:**
- An object can be left behind if step 2 fails, or if removal fails after
  the row is deleted. Nobody but the owner can read it. A cleanup job can
  come later.
- `allowed_mime_types` trusts the client-declared type. Files are private to
  their owner, so the risk is low. Magic-byte checking is deferred.

## CSV export

The `/export` route handler calls `requireUser()`, queries all of the user's
applications (joined to stage and document names), and returns
`text/csv; charset=utf-8` with
`Content-Disposition: attachment; filename="jat-applications-YYYY-MM-DD.csv"`.

Encoding is a pure function in `src/features/export/`:
- RFC 4180 quoting (commas, quotes, newlines)
- UTF-8 BOM, so Excel detects the encoding
- Protection against formula injection: cells that start with `= + - @`
  or a tab or CR get a leading `'`

## UI

- shadcn/ui components. Forms use `useActionState` and show field errors
  from `ActionResult`.
- New application: a "New application" button on the overview opens the form
  in a dialog (a full-screen sheet below `md`), and so does the empty
  state's link. It holds only the creation fields (company, role, and the
  optional basics). Everything else is edited on the detail page. On
  success the dialog closes and the table refreshes. There's no separate
  route.
- Overview: a table at `md` and up. Below `md` it collapses to stacked rows
  showing company, role, stage, and next action (US-19). Filters are links
  or selects that update search params.
- Text the user enters is always rendered as text. No HTML or markdown in
  v1.

## Testing

| Layer | Tool | Location | Covers |
|---|---|---|---|
| Pure logic | Vitest | colocated `*.test.ts` | Zod schemas, `time.ts`, reminder/stale rules, CSV encoding, error mapping |
| Database | pgTAP via `supabase test db` | `supabase/tests/*.test.sql` | RLS for two users on every table, cross-user FK rejection, kind enforcement, delete restrictions, history snapshots, activity triggers (including no-op saves and stage renames not bumping), default stages, storage policies |
| Components | Vitest + Testing Library | colocated `*.test.tsx` | Only where a component has real logic |

New scripts:
- `pnpm test:db`: `supabase test db`. Needs local Supabase running.
- `pnpm check` stays Docker-free (lint, typecheck, Vitest) so it works
  anywhere. Run `pnpm test:db` before calling a schema change done.

**CI** gets a second job, `db`, that installs the Supabase CLI, starts only
what tests need, and runs:
1. `supabase db reset` (applies all migrations + seed)
2. `supabase test db`
3. A types drift check: regenerate `src/types/database.ts` and fail if it
   differs from the committed file

## Build order

Each step is one or more small PRs, each with its migration, pgTAP tests,
and regenerated types.

1. **Foundation**: `profiles`, `stages`, signup trigger, pgTAP setup,
   `test:db` script, CI `db` job. (US-1 default stages)
2. **Applications**: table, history trigger, activity trigger, create/edit/
   close/delete actions, overview with filters and sorting, detail page with
   history. (US-2–9)
3. **Stage settings**: add/rename/reorder/delete. (US-10)
4. **Interviews**: table, activity bump, CRUD on the detail page. (US-11)
5. **Documents**: bucket + policies, table, upload flow, pickers on the
   application form, delete rules. (US-12–14)
6. **Follow-ups and reminders**: time zone capture + settings, next action
   UI, reminders and stale highlighting. (US-15–17)
7. **Export**: CSV route. (US-18)

Responsive layout (US-19) is part of each UI step, not a separate step.
