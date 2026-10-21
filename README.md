# jat: Job Application Tracker

Next.js 16 · TypeScript · Neon (Postgres + Auth) · Drizzle · Tailwind/shadcn · Biome · Vitest · pnpm

## Setup

Requires Node 24+, pnpm 11, and a Neon project with Neon Auth enabled (magic
link and GitHub turned on).

```sh
pnpm install
cp .env.example .env.local       # fill in from your Neon dev branch
pnpm db:migrate                  # apply migrations to that branch
pnpm dev
```

Use your own Neon branch for local work, never the primary branch. Reset it
from the primary branch in the Neon Console when you want a clean copy.

## Deployments

Vercel builds run `pnpm db:migrate` before `next build` (`vercel.json`), so
each deployment migrates its own Neon branch:

- **Production** uses the `production` branch.
- **Previews** each get a `preview/<git-branch>` branch from the Neon Vercel
  integration, deleted when the git branch is. The build also trusts the
  preview's URLs in that branch's Neon Auth (`scripts/trust-preview-domains.mts`).
  Previews sign in by magic link only.

Vercel environment variables:

| Variable | Production | Preview |
|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL` | You, from the `production` branch | Neon integration, per deployment |
| `NEON_AUTH_COOKIE_SECRET` | You | You |
| `NEON_API_KEY` (project-scoped), `NEON_PROJECT_ID` | not set | You |

See `CLAUDE.md` for commands and conventions.
