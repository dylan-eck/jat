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

See `CLAUDE.md` for commands and conventions.
