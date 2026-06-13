#!/bin/bash
# powerpuff-guard: blocks bash access to protected paths and human-only commands.
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

deny() { echo "powerpuff-guard: blocked - $1" >&2; exit 2; }

# Legitimate read-only use of the validator is allowed.
printf '%s' "$cmd" | grep -qE '^python3 powerpuff/templates/common/scripts/koto-check\.py [^;&|<>]*$' && exit 0

# Human-only commands (deny tier)
printf '%s' "$cmd" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+push'  && deny "git push is human-only; add a TODO to kotodute/human-todo.md"
printf '%s' "$cmd" | grep -qE 'git[[:space:]]+reset[[:space:]]+--hard' && deny "git reset --hard is human-only"
printf '%s' "$cmd" | grep -qE 'git[[:space:]]+(clean|filter-branch)'   && deny "destructive git is human-only"

# Protected paths: no bash access at all - file changes must go through the Edit/Write
# tools, which the permission rules govern and the transcript records.
for p in 'kotodute/scope\.md' 'kotodute/human-todo\.md' 'kotodute/lily/human-todo\.md' 'powerpuff/' '\.claude/' '\.opencode/' '\.vibe/' '\.pi/'; do
  printf '%s' "$cmd" | grep -qE "$p" && deny "bash access to protected path; use the Edit tool"
done

exit 0
