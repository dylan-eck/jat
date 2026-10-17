#!/usr/bin/env bash
# PostToolUse hook: format and lint-fix the file Claude just edited.
# Never blocks: Biome errors surface on `pnpm lint` instead.
file=$(jq -r '.tool_input.file_path // empty')
[[ -z "$file" || ! -f "$file" ]] && exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.json|*.jsonc|*.css)
    cd "$CLAUDE_PROJECT_DIR" && pnpm exec biome check --write --no-errors-on-unmatched "$file" >/dev/null 2>&1
    ;;
esac
exit 0
