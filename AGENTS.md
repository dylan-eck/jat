# Job Application Tracker (jat)

Small full-stack app for tracking job applications. Built mainly to practice
agent-driven development, so keep changes small, tested, and easy to review.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stack
- Next.js 16 (App Router, Cache Components on, `src/proxy.ts` not `middleware.ts`)
- TypeScript strict (+ `noUncheckedIndexedAccess`)
- Neon Postgres (one branch per Vercel preview) via Drizzle ORM + drizzle-kit
- Neon Auth (managed Better Auth) via `@neondatabase/auth`: magic link + GitHub
- Tailwind v4 + shadcn/ui (`src/components/ui`, add with `pnpm dlx shadcn@latest add <name>`)
- Zod for input validation, Biome for lint/format, Vitest for tests, pnpm

## Commands
- `pnpm dev`: dev server at http://localhost:3000
- `pnpm check`: lint + typecheck + unit tests. Run before calling a task done.
- `pnpm test` / `pnpm test:watch`: unit tests (no database)
- `pnpm test:db`: `*.db.test.ts` against the Neon branch in `DATABASE_URL`.
  Run before calling a schema or query change done.
- `pnpm lint:fix`: Biome autofix (Claude Code also runs this on every file it edits, via `.claude/hooks/`)
- `pnpm db:generate --name <name>`: new migration in `drizzle/` from `src/lib/db/schema.ts`
- `pnpm db:migrate`: apply pending migrations to the branch in `DATABASE_URL_UNPOOLED`
- `pnpm db:studio`: browse the database

## Layout
- `src/app/`: routes only; keep pages thin
- `src/features/<feature>/`: `actions.ts` (Server Actions), `queries.ts` (reads),
  `schema.ts` (Zod), `components/`, colocated `*.test.ts` and `*.db.test.ts`
- `src/lib/db/`: `schema.ts` (tables), `client.ts` (`db`), `neon-auth.ts` (Neon Auth's user table, read-only)
- `src/lib/auth/server.ts`: the Neon Auth instance (sessions, sign-in/out, `/api/auth`, proxy)
- `drizzle/`: generated migrations; the only way to change the schema
- `src/test/`: db test helpers (`createTestUser`, `pgErrorCode`)

## Rules
- Change the schema only in `src/lib/db/schema.ts`, then `pnpm db:generate`.
  Never edit generated migrations or `drizzle/meta` by hand, and never touch
  the `neon_auth` schema.
- Every table has `user_id` referencing `neon_auth."user"` (cascade). Every
  query and write is scoped to `requireUser().id`; a row that doesn't match is
  "not found". References between user rows use composite FKs that include
  `user_id`, so another user's ids are rejected by the database.
- Functions that take a user id (e.g. `initializeUser`) live in `server-only`
  modules, never in `"use server"` files, which are callable from the browser.
- Server-side auth checks use `requireUser()` / `getCurrentUser()` (Neon Auth
  `getSession()` on the server). Re-check the user inside every Server Action.
- `proxy.ts` is an optimistic check only, not authorization.
- Each Vercel preview has its own Neon branch, migrated during the build.
  Previews sign in by magic link only; the GitHub button is hidden there.
- With Cache Components, anything reading cookies (sessions, `requireUser()`)
  must render inside `<Suspense>`; don't await it at a layout's top level.
- Validate all Server Action input with Zod.
- Never read or print `.env.local`; only `.env.example` is committed.

## Git hooks

A Husky pre-commit hook (`.husky/pre-commit`) runs Biome and the typecheck.
Never bypass it: do not use `--no-verify` or `-n` on `git commit`, or `--no-verify` on `git push`,
and do not set `HUSKY=0` or otherwise disable hooks. If the hook fails, fix the
underlying lint or type errors and commit again. If you believe the hook itself
is wrong, stop and ask the user instead of working around it.
