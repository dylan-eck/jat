# jat: Architecture Spec

How the product in [`product.md`](./product.md) is built. Stack and repo
conventions live in [`AGENTS.md`](../AGENTS.md). This document covers the
decisions on top of those.

## Principles

1. **Only the server talks to the database.** There is no public data API.
   Server Components and Server Actions query Postgres through Drizzle, and
   every query is scoped to `requireUser().id`. A row that belongs to
   someone else is "not found".
2. **Constraints are the safety net.** Ownership is enforced by the app, so
   the database guards what a buggy query could get wrong: composite FKs
   that include `user_id` reject references to another user's rows, and
   checks and uniques hold the data rules. Rules that span several writes
   (stage history, activity tracking) run in one transaction in the Server
   Action, built from pure functions that are unit-tested.
3. **Server-first UI.** Pages are Server Components that read through
   `queries.ts`. Client Components exist only for interactivity (forms,
   filters, uploads).
4. **Pure logic is pulled out and unit-tested.** Date math, CSV encoding,
   reminder/stale rules, history diffs, and error mapping are plain
   functions with Vitest tests. Queries, actions, and constraints are tested
   against a real Neon branch (`*.db.test.ts`).

## System overview

```
Browser ──► Next.js on Vercel ─────────────► Neon branch
  │          proxy.ts (optimistic redirect)    Postgres (Drizzle, pg Pool)
  │          /api/auth/* ──────────────────►   Auth (magic link, GitHub)
  │          Server Components → queries.ts    Object Storage (private
  │          Server Actions    → actions.ts      "documents" bucket)
  │          Route Handlers (CSV, file links)
  └──────── presigned PDF upload ────────────► Object Storage
```

PDFs go from the browser straight to Object Storage (see
[Documents](#documents)). Everything else goes through Next.js.

Postgres, Auth (users and sessions live in the `neon_auth` schema), and
Object Storage all branch together:

| Environment | Neon branch | Created by |
|---|---|---|
| Production | `production` | Neon project setup |
| Vercel preview | `preview/<git-branch>`, from `production` | Neon Vercel integration, deleted with the git branch |
| Local | `dev` (or your own) | `neon checkout` |
| CI `db` job | `ci-<run>`, expires after 1 hour | `create-branch-action` |

Every Vercel build runs `pnpm db:migrate` against its own branch. Preview
builds also add their URLs to their branch's Neon Auth trusted domains
(`scripts/trust-preview-domains.mts`), since Neon Auth only redirects to
trusted origins. Previews sign in by magic link only: the GitHub OAuth app
only accepts production's Neon Auth callback.

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
| `src/features/applications/` | Application CRUD, overview query, history query, `history.ts` (pure event and activity diff) |
| `src/features/stages/` | Stage list, add/rename/reorder/delete |
| `src/features/interviews/` | Interview CRUD |
| `src/features/documents/` | Upload registration, rename, delete, signed URLs |
| `src/features/settings/` | Profile (time zone, stale threshold) |
| `src/features/reminders/` | Pure needs-attention / upcoming / stale logic |
| `src/features/export/` | CSV encoding |
| `src/lib/db/schema.ts` | Every table, constraint, and index (migrations are generated from it) |
| `src/lib/time.ts` | Time zone helpers (today in tz, local ↔ UTC) |
| `src/lib/action-result.ts` | Shared Server Action result type + Postgres error mapping |

## Data model

All tables live in `public` and have a `user_id uuid not null references
neon_auth."user" on delete cascade`. Timestamps are `timestamptz`. There is
no RLS: nothing outside the server can reach the database.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK | |
| `time_zone` | text, nullable | IANA name. Null until the browser reports it. Validated with Zod (`Intl.supportedValuesOf("timeZone")`) |
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
| `last_activity_at` | timestamptz not null | Written only by `history.ts` helpers |
| `created_at`, `updated_at` | timestamptz | |

`unique (id, user_id)` is the target for interviews and history.

The composite foreign keys are how US-2's cross-user write criteria are met.
Actions set `user_id` from the session, so a plain `stage_id` FK would still
accept another user's stage id. Including `user_id` in the key makes that
impossible.
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

Rows are written only in the same transaction as the application change
they describe, using `eventFor(before, after, stageNames)` from
`history.ts`. No action updates or deletes them.

### Writable fields

Each action's Zod schema lists the fields a user can set. `user_id` always
comes from `requireUser()`, never from input. `last_activity_at`,
`created_at`, `documents.kind`, and `documents.storage_path` are not in any
update schema, so they can't change after insert.

## Where rules are enforced

### Database constraints

| Rule | Mechanism | Stories |
|---|---|---|
| References point to the user's own stages/documents/applications | Composite FKs including `user_id` | US-2 |
| Resume/cover letter pickers can't take the wrong kind | Composite FK including generated `*_kind` column | US-13 |
| In-use stages and documents can't be deleted | `on delete restrict` | US-10, 14 |
| Field rules (lengths, URL scheme, close reason only when closed, ranges) | `check` constraints | US-3, 6, 17 |
| Stage names are unique per user, ignoring case | Unique index on `(user_id, lower(name))` | US-10 |
| Deleting a user deletes their data | `on delete cascade` from `neon_auth."user"` | US-1 |

### Server Actions

| Rule | Mechanism | Stories |
|---|---|---|
| Users see and change only their own rows | Every query filters on `requireUser().id` | US-2 |
| New users get a profile + default stages | `initializeUser()` in `/auth/callback`, one transaction, idempotent | US-1 |
| Stage/status changes are recorded with name snapshots | The action writes the application and its `application_events` row in one transaction | US-3, 6, 7, 8 |
| `last_activity_at` only moves on real changes | `history.ts` compares the user-editable fields before and after, and bumps only if they differ. Interview create/update/delete bumps the parent in the same transaction (on update, only if the row changed) | US-17 |
| Stage reorders are atomic | One transaction updating every position | US-10 |
| At least one stage remains | Checked before delete | US-10 |

"At least one stage must remain" is not a database check. With zero stages
nothing breaks, the user just can't create applications, and a check would
get in the way of cascading account deletes.

Functions that take a user id (like `initializeUser`) live in `server-only`
modules, never in `"use server"` files, which the browser can call.

## Data flow

### Reads
- `queries.ts` functions call `requireUser()` (Neon Auth `getSession()` on
  the server), then query with Drizzle, filtering on `user_id`.
- **No `use cache` for user data in v1.** User data always depends on the
  session cookie, and the volume per user is small, so every request reads
  fresh. Pages render a static shell and stream user data inside
  `<Suspense>`, following AGENTS.md. Revisit only if a page is measurably
  slow.

### Mutations
- Every Server Action follows the same steps: `requireUser()` → Zod
  `safeParse` → Drizzle write (a transaction when it touches history or
  activity) → map errors → `refresh()` from
  `next/cache` (or `redirect()` after create or delete).
- All actions return the shared `ActionResult` type:
  `{ ok: true, data? } | { ok: false, fieldErrors?, formError? }`.
  Forms consume it with `useActionState`.
- Postgres errors are mapped in one place (`src/lib/action-result.ts`),
  reading the code from `error.cause ?? error` because Drizzle wraps `pg`
  errors, e.g.:
  - `23001` restrict violation on stage/document delete → "Used by N applications"
    (the action then queries which ones)
  - `23503` on insert/update → "Invalid stage or document", which also
    covers attempts to reference another user's rows
  - `23505` unique violation → "A stage with that name already exists"
- Updates and deletes filter on both `id` and `user_id`, so another user's
  row affects 0 rows. Actions treat that as not-found and never reveal that
  the row exists.

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

Files live in the branch's private `documents` bucket in Neon Object
Storage (S3-compatible, declared in `neon.ts`). Objects branch with the
database, so a preview sees production's files as of when it branched and
its writes never touch production.

**Upload goes directly from the browser to Object Storage**, not through a
Server Action. Server Actions default to a 1 MB body limit, and Vercel
Functions cap request bodies at 4.5 MB, so a 10 MB PDF can't go through
Next.js.

1. A Client Component checks type and size up front (for UX only), then
   calls the `startUpload({ kind })` Server Action. The action re-checks the
   user and returns a presigned POST for the key
   `{user_id}/{crypto.randomUUID()}.pdf`, valid for 5 minutes, whose policy
   requires `Content-Type: application/pdf` and a size of at most 10 MB. The
   size limit is enforced by storage, not just the client.
2. The browser posts the file to that URL.
3. It calls the `createDocument({ key, name, kind })` Server Action. The
   action re-checks the user, checks that `key` starts with their id,
   confirms the object exists (`HeadObject`) and is ≤ 10 MB, and inserts the
   `documents` row.
4. Upload from the application form (US-13) uses the same component, then
   selects the new document.

The S3 client is server-only and reads the branch's `AWS_*` variables.
Credentials never reach the browser.

Viewing a file: `/documents/[id]/file` loads the row (scoped to the user),
creates a 60-second presigned GET, and redirects to it. Presigned URLs never
end up in page HTML.

Deleting a file: delete the row first (the FK blocks it if the document is
in use), then delete the object.

**To verify before building:** that the bucket accepts browser POSTs (CORS)
and that the Vercel integration injects the `AWS_*` variables per preview.

**Known gaps, accepted for v1:**
- An object can be left behind if step 3 fails, or if removal fails after
  the row is deleted. Nobody but the owner can read it. A cleanup job can
  come later.
- The content type is the one the client declares. Files are private to
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
| Pure logic | Vitest (`unit` project) | colocated `*.test.ts` | Zod schemas, `time.ts`, reminder/stale rules, history and activity diffs, CSV encoding, error mapping |
| Database | Vitest (`db` project) against a Neon branch | colocated `*.db.test.ts` | Two-user isolation for every query and action, cross-user FK rejection, kind enforcement, delete restrictions, history snapshots, activity bumps (including no-op saves and stage renames not bumping), default stages, check constraints |
| Components | Vitest + Testing Library | colocated `*.test.tsx` | Only where a component has real logic |

Scripts:
- `pnpm check`: lint, typecheck, unit tests. No database needed.
- `pnpm test:db`: db tests against the branch in `DATABASE_URL`. Run it
  before calling a schema or query change done.

**CI** has two jobs:
- `check`: `pnpm check` and `next build` with placeholder env values.
- `db`:
  1. Migration drift check: `pnpm db:generate` must not change `drizzle/`.
  2. Create a Neon branch from `production` that expires in an hour.
  3. `pnpm db:migrate`, then `pnpm test:db`.
  4. Delete the branch.

## Build order

Each step is one or more small PRs, each with its generated migration and
db tests, and each tried on its own preview deployment.

1. **Foundation** (done): `profiles`, `stages`, default stages on first
   sign-in, db tests, CI `db` job, preview branches. (US-1 default stages)
2. **Applications**: table, history and activity in actions, create/edit/
   close/delete actions, overview with filters and sorting, detail page with
   history. (US-2–9)
3. **Stage settings**: add/rename/reorder/delete. (US-10)
4. **Interviews**: table, activity bump, CRUD on the detail page. (US-11)
5. **Documents**: table, presigned upload flow, pickers on the
   application form, delete rules. (US-12–14)
6. **Follow-ups and reminders**: time zone capture + settings, next action
   UI, reminders and stale highlighting. (US-15–17)
7. **Export**: CSV route. (US-18)

Responsive layout (US-19) is part of each UI step, not a separate step.
