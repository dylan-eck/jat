#!/usr/bin/env bash
# Stop hook: run `pnpm check` before Claude finishes. On failure, exit 2 so
# Claude keeps working, with the failing output on stderr as the reason.
# Skipped when nothing has changed since the last passing check.
input=$(cat)

# Already continuing because of a previous block: let Claude stop rather than
# loop on a failure it couldn't fix.
if [[ $(jq -r '.stop_hook_active // false' <<<"$input") == "true" ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Fingerprint of the working tree: HEAD, tracked changes, and untracked
# (non-ignored) file contents. Stored in .git so it is never committed.
fingerprint() {
  {
    git rev-parse HEAD
    git diff HEAD --binary
    git ls-files --others --exclude-standard -z | xargs -0 shasum 2>/dev/null
  } | shasum | cut -d' ' -f1
}
cache="$(git rev-parse --git-dir)/claude-last-passing-check"
current=$(fingerprint)

if [[ -f "$cache" && $(<"$cache") == "$current" ]]; then
  exit 0
fi

if ! output=$(pnpm check 2>&1); then
  {
    echo "pnpm check failed. Fix these errors before finishing:"
    echo
    tail -n 60 <<<"$output"
  } >&2
  exit 2
fi

echo "$current" >"$cache"
exit 0
