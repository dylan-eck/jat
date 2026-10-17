# Job Application Tracker (jat)

Small full-stack app for tracking job applications. Built mainly to practice
agent-driven development, so keep changes small, tested, and easy to review.

@AGENTS.md

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
- `pnpm lint:fix`: Biome autofix (a hook also runs this on every file you edit)
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
- Never bypass the pre-commit hook (`--no-verify`, `-n`, `HUSKY=0`). Fix the
  errors it reports; if the hook seems wrong, ask the user. See AGENTS.md.
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
- Before using a Next.js API, check `node_modules/next/dist/docs/`; this
  version differs from older training data.
