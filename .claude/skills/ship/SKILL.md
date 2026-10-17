---
name: ship
description: Run checks, commit the current changes with a clear message, push the branch, and open a PR using the repo's PR template.
argument-hint: "[optional notes for the commit/PR]"
disable-model-invocation: true
allowed-tools: Bash(cat .github/pull_request_template.md), Bash(pnpm check), Bash(git status *), Bash(git diff *), Bash(git log *), Bash(git branch *), Bash(git checkout -b *), Bash(git add *), Bash(git commit -F *), Bash(git push -u origin *), Bash(gh pr view *), Bash(gh pr create *), Bash(gh pr checks *)
---

Ship the current work as a pull request. Extra notes from the user (may be empty): $ARGUMENTS

## Current state

- Branch: !`git branch --show-current`
- Status: !`git status --short --branch`
- Diff vs HEAD: !`git diff HEAD --stat`
- Commits ahead of main: !`git log --oneline main..HEAD`

## PR template

```!
cat .github/pull_request_template.md
```

## Steps

Stop and report to the user at any step that fails. Do not skip ahead.

1. **Nothing to ship?** Stop and say so if either:
   - there are no uncommitted changes and no commits ahead of `main`; or
   - there are no uncommitted changes, the branch is fully pushed (the first
     Status line shows an `origin/<branch>` upstream with no `[ahead N]`), and
     `gh pr view --json url,state` shows an `OPEN` PR. Report that PR's URL.
2. **Branch.** If on `main`, create a branch first: `<type>/<short-kebab-name>`,
   where type is `feat`, `fix`, `chore`, `docs`, `refactor`, or `test`, based
   on the changes. Never commit or push directly to `main`.
3. **Check.** Run `pnpm check`. If it fails, show the errors and stop. Don't
   commit failing code, and don't start fixing unless the user asks.
4. **Review what's being committed.** Read the full diff (`git diff HEAD`, plus
   any untracked files). Stop and ask if you see secrets, `.env.local`, build
   output, or changes that look unrelated to the rest. Stage files by name
   with `git add <paths>`.
5. **Commit.** If there are no uncommitted changes (the branch only has
   unpushed commits), skip to step 6. Otherwise write the message to a temp file and commit with
   `git commit -F <file>`:
   - Subject: imperative mood, max ~72 characters, says *what* changed
     (e.g. "Add applications table with RLS policies").
   - Body: a few bullets on what changed and why, if the subject alone isn't enough.
   - Include the attribution trailer your Claude Code instructions specify.
   - Never bypass the pre-commit hook (see AGENTS.md). If it fails, report the
     errors and stop.
6. **Push.** `git push -u origin <branch>`.
7. **PR.** Run `gh pr view --json url,state`. If an open PR already exists
   for this branch, the push has updated it: report its URL and skip to step 8. Otherwise create one with
   `gh pr create --base main --title "<subject>" --body-file <file>`, where
   the body fills in **every section** of the template above:
   - What / Why / How to test: concrete and short, based on the diff.
   - Checklist: tick only items you actually verified (`pnpm check` passed in
     step 3). Mark items that don't apply as `(n/a)`. Leave the rest unticked.
   - Agent notes: what Claude wrote, judgment calls made, and anything the
     reviewer should look at closely.
   - End with the PR attribution line your Claude Code instructions specify.
8. **CI.** Run `gh pr checks --watch` and report the result.
9. **Report** the PR URL, the commit subject, and the CI result in a few lines.
