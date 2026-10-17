# jat: Job Application Tracker

Next.js 16 · TypeScript · Supabase · Tailwind/shadcn · Biome · Vitest · pnpm

## Setup

Requires Node 24+, pnpm 11, and Docker (for local Supabase).

```sh
pnpm install
pnpm db:start                    # prints local API URL + publishable key
cp .env.example .env.local       # paste the publishable key in
pnpm dev
```

Local Supabase Studio: http://127.0.0.1:54323

See `CLAUDE.md` for commands and conventions.
