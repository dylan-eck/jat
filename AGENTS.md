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
- Supabase: Postgres + Auth via `@supabase/ssr`; authorization is enforced by RLS
- Tailwind v4 + shadcn/ui (`src/components/ui`, add with `pnpm dlx shadcn@latest add <name>`)
- Zod for input validation, Biome for lint/format, Vitest for tests, pnpm

## Commands
- `pnpm dev`: dev server at http://localhost:3000
- `pnpm check`: lint + typecheck + tests. Run before calling a task done.
- `pnpm test` / `pnpm test:watch`
- `pnpm lint:fix`: Biome autofix (Claude Code also runs this on every file it edits, via `.claude/hooks/`)
- `pnpm db:start` / `pnpm db:stop`: local Supabase (needs Docker)
- `pnpm db:migration <name>`: new SQL file in `supabase/migrations/`
- `pnpm db:reset`: reapply all migrations + `supabase/seed.sql` locally
- `pnpm db:types`: regenerate `src/types/database.ts` after any schema change

## Layout
- `src/app/`: routes only; keep pages thin
- `src/features/<feature>/`: `actions.ts` (Server Actions), `queries.ts` (reads),
  `schema.ts` (Zod), `components/`, colocated `*.test.ts`
- `src/lib/supabase/`: `client.ts` (browser), `server.ts` (server), `proxy.ts` (session refresh)
- `supabase/migrations/`: the only way to change the schema

## Rules
- Never edit `src/types/database.ts` by hand; run `pnpm db:types`.
- Never change the schema outside a migration. Every table gets RLS enabled
  with policies scoped to `auth.uid()` in the same migration.
- Server-side auth checks use `supabase.auth.getClaims()` (or `getUser()`),
  never `getSession()`. Re-check the user inside every Server Action.
- `proxy.ts` is an optimistic check only, not authorization.
- With Cache Components, anything reading cookies (i.e. the Supabase server
  client) must render inside `<Suspense>`; don't await it at a layout's top level.
- Validate all Server Action input with Zod.
- Never read or print `.env.local`; only `.env.example` is committed.

## Git hooks

A Husky pre-commit hook (`.husky/pre-commit`) runs Biome and the typecheck.
Never bypass it: do not use `--no-verify` or `-n` on `git commit`, or `--no-verify` on `git push`,
and do not set `HUSKY=0` or otherwise disable hooks. If the hook fails, fix the
underlying lint or type errors and commit again. If you believe the hook itself
is wrong, stop and ask the user instead of working around it.
