<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git hooks

A Husky pre-commit hook (`.husky/pre-commit`) runs Biome and the typecheck.
Never bypass it: do not use `--no-verify` or `-n` on `git commit`, or `--no-verify` on `git push`,
and do not set `HUSKY=0` or otherwise disable hooks. If the hook fails, fix the
underlying lint or type errors and commit again. If you believe the hook itself
is wrong, stop and ask the user instead of working around it.
