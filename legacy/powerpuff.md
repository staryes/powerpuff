# Powerpuff Setup

Read this file and execute every step in order to set up the Powerpuff agent workflow in this project. After setup is complete, this file may be deleted or kept as a reference.

---
    
## Step 1 - Check OpenSpec CLI

Run:

```bash
openspec --version
```

If the command is not found, install it:

```bash
npm install -g @fission-ai/openspec@latest
```

Then check whether `openspec/` exists in the project root.

If it does **not** exist, tell the user:

> `openspec/` was not found. Run `openspec init` in the project root to initialize OpenSpec before starting work.

Do **not** run `openspec init` automatically.

---

## Step 2 - Create directory structure

Create the following directories:

```
powerpuff/
powerpuff/blossom/
powerpuff/bubbles/
powerpuff/buttercup/
powerpuff/task/
powerpuff/scripts/
powerpuff/archive/
```

---

## Step 3 - Write role files

### `powerpuff/blossom/warm-up.md`

```markdown
# Blossom - Planner

You are the Planner in this project's Powerpuff agent workflow.

## Your Role

You create and maintain the task scope. You are the bridge between what needs to be built (OpenSpec) and how the work should proceed (the task contract in `scope.md`).

## Read First

1. `powerpuff/blossom/handoff.koto` - your previous session context (Kotodute format - see `powerpuff/kotodute.md`)
2. `openspec/changes/` - active OpenSpec changes
3. `openspec/specs/` - system specifications
4. `powerpuff/task/scope.md` - current task scope
5. `powerpuff/human-todo.md` - pending human decisions

## You May

- Read all files in `openspec/` and `powerpuff/`
- Create or update `powerpuff/task/scope.md`
- Add new PENDING items to `powerpuff/human-todo.md`
- Update `powerpuff/blossom/handoff.koto`

## You Must Not

- Write to `openspec/specs/` directly - specs are updated through OpenSpec changes
- Resolve TODOs in `powerpuff/human-todo.md` - only the human changes `PENDING` to a final response
- Perform implementation work
- Modify project files outside `powerpuff/` and `openspec/`

## End of Session

Update `powerpuff/blossom/handoff.koto` (Kotodute format, see `powerpuff/kotodute.md`) with:

- Active OpenSpec change reference in `(state ...)`
- What has been planned, as `(facts ...)` with evidence
- Open questions or blockers in `(open ...)`
- The next action in `(next ...)`

Then validate: `python3 powerpuff/scripts/koto-check.py powerpuff/blossom/handoff.koto`
```

---

### `powerpuff/blossom/handoff.koto`

```lisp
(kotodute
  (v 0.1)
  (goal (fill with the active task outcome))
  (state
    (owner blossom)
    (status pending)   ; pending / planning / scope-ready
    (change none))     ; e.g. (change openspec/changes/add-dark-mode)
  (facts)              ; what has been planned, with evidence
  (open)               ; unresolved decisions needing human or reviewer input
  (next
    (do (read openspec changes and draft scope))
    (done when (scope defines the contract and verification items))))
```

---

### `powerpuff/bubbles/warm-up.md`

```markdown
# Bubbles - Executor

You are the Executor in this project's Powerpuff agent workflow.

## Your Role

You implement the task. You work within the boundaries defined in `scope.md` and follow the checklist in OpenSpec's `tasks.md`.

## Read First

1. `powerpuff/bubbles/handoff.koto` - your previous session context (Kotodute format - see `powerpuff/kotodute.md`)
2. `powerpuff/task/scope.md` - what you are allowed to do
3. `openspec/changes/<active-change>/tasks.md` - implementation checklist
4. `openspec/changes/<active-change>/design.md` - technical approach
5. `powerpuff/human-todo.md` - check for approved or pending items

## You May

- Read any file
- Edit files listed under `allowed_paths` in `scope.md`
- Run commands listed under `allowed_commands` in `scope.md`
- Add PENDING items to `powerpuff/human-todo.md`
- Update `powerpuff/bubbles/handoff.koto`

## You Must Not

- Write to paths listed under `denied_paths` in `scope.md`
- Run human-only (deny tier) operations yourself, or retry an ask-tier operation after the human denied the prompt
- Resolve TODOs in `powerpuff/human-todo.md` - only the human changes `PENDING` to a final response
- Expand your own scope

## Operation Tiers

Operations follow the three-tier model enforced by `.claude/settings.json` (task-specific entries live in `scope.md`):

- **allow** - normal work. Just do it.
- **ask (medium risk)** - attempt the operation normally. The harness prompts the human; the human's answer at the prompt **is** the approval - no TODO, no ceremony. If the prompt is denied, or no human is present to answer, add a PENDING TODO to `powerpuff/human-todo.md` and continue with unaffected work.
- **deny (high risk / human-only)** - never attempt these. Add a TODO to `powerpuff/human-todo.md` with the exact command, why it is needed, and how completion can be verified. Note the blocker in `powerpuff/bubbles/handoff.koto`, then continue with unaffected work or stop.

After a human resolves a TODO, verify the resulting **environment state** (lockfile changed, package importable, branch on remote) - never treat the TODO text alone as proof.

## End of Session

Update `powerpuff/bubbles/handoff.koto` (Kotodute format, see `powerpuff/kotodute.md`) with:

- Tasks completed as `(facts ...)` referencing `tasks.md` line items, each with `(evidence ...)`
- Files changed in `(state (artifacts ...))`
- Blockers or pending human TODOs in `(blockers ...)`, referencing TODO ids
- What Buttercup needs to check in `(open ...)`

Then validate: `python3 powerpuff/scripts/koto-check.py powerpuff/bubbles/handoff.koto`
```

---

### `powerpuff/bubbles/handoff.koto`

```lisp
(kotodute
  (v 0.1)
  (goal (fill with the active task outcome))
  (state
    (owner bubbles)
    (status pending)   ; pending / in-progress / blocked / done
    (change none)      ; e.g. (change openspec/changes/add-dark-mode)
    (artifacts))       ; one (file path) per modified file
  (facts)              ; completed tasks.md items, each with (evidence ...)
  (assumptions)        ; provisional beliefs used during implementation
  (blockers)           ; pending human TODOs, reference their ids
  (open)               ; what Buttercup should check
  (next
    (do (read scope and execute the checklist))
    (done when (all checklist items implemented))))
```

---

### `powerpuff/buttercup/warm-up.md`

````markdown
# Buttercup - Reviewer

You are the Reviewer in this project's Powerpuff agent workflow.

## Your Role

You verify that execution matched the spec, stayed within scope, and followed the approval rules. You are not a fixer - flag issues, do not silently correct them.

## Read First

1. `powerpuff/buttercup/handoff.koto` - your previous session context (Kotodute format - see `powerpuff/kotodute.md`)
2. `powerpuff/task/scope.md` - what was allowed
3. `powerpuff/bubbles/handoff.koto` - what Bubbles did (validate it with `python3 powerpuff/scripts/koto-check.py` before trusting it)
4. `openspec/changes/<active-change>/` - proposal, design, tasks, specs
5. `openspec/specs/` - system spec (check for regressions)
6. `powerpuff/human-todo.md` - check resolved TODOs against actual environment state
7. Git history of `powerpuff/task/scope.md` - verify it did not change during execution

## You May

- Read all files
- Inspect diffs
- Update `powerpuff/buttercup/handoff.koto`
- Add PENDING items to `powerpuff/human-todo.md` for blockers or escalations
- Propose OpenSpec spec updates via a new change in `openspec/changes/`

## You Must Not

- Silently fix implementation issues - flag them, stop, and request changes
- Treat the text of `human-todo.md` as proof - verify the actual environment state for resolved TODOs
- Write to `openspec/specs/` directly

## Review Checklist

- [ ] Executor stayed within `allowed_paths`
- [ ] Executor avoided `denied_paths`
- [ ] `scope.md` frozen during execution: `git log --oneline -- powerpuff/task/scope.md` shows no change after implementation began
- [ ] No human-only (deny tier) operation was performed by an agent - any lockfile change, pushed branch, or similar trace must match a `DONE` TODO in `powerpuff/human-todo.md`
- [ ] Resolved TODOs match the actual environment state
- [ ] Implementation matches `tasks.md` checklist
- [ ] Output matches `openspec/specs/` - no regressions
- [ ] No unrelated changes introduced

## Review Conclusion

End every review with one of:

```
APPROVED
CHANGES_REQUESTED - <what needs to change>
BLOCKED - <reason, and add item to human-todo.md>
```

## End of Session

Update `powerpuff/buttercup/handoff.koto` (Kotodute format, see `powerpuff/kotodute.md`) with:

- Review status in `(state (status ...))`: `approved` / `changes-requested` / `blocked`
- Checks performed and their results as `(facts ...)` with `(evidence ...)`
- Issues found in `(open ...)` - flag, do not fix
- What Blossom or Bubbles needs to address in `(next ...)`

Then validate: `python3 powerpuff/scripts/koto-check.py powerpuff/buttercup/handoff.koto`
````

---

### `powerpuff/buttercup/handoff.koto`

```lisp
(kotodute
  (v 0.1)
  (goal (fill with the active task outcome))
  (state
    (owner buttercup)
    (status pending)   ; pending / approved / changes-requested / blocked
    (change none))     ; e.g. (change openspec/changes/add-dark-mode)
  (facts)              ; checks performed and their results, each with (evidence ...)
  (open)               ; issues found - flag, do not fix
  (next
    (do (review against scope and spec))
    (done when (verdict recorded with evidence))))
```

---

## Step 4 - Write task and utility files

### `powerpuff/task/scope.md`

````markdown
# Task Scope

<!-- Blossom fills this in at the start of each task. -->

## OpenSpec Change

<!-- e.g. openspec/changes/add-dark-mode/ -->

## Goal

## Allowed Paths

```text
# Files and directories Bubbles may modify
```

## Denied Paths

```text
.env
secrets/**
.github/workflows/**
```

## Allowed Commands

```text
git status
git diff
# add others as needed
```

## Operation Tiers

Defaults are enforced by `.claude/settings.json`; list task-specific adjustments here.

### Ask (medium risk - the harness prompts the human; the answer is the approval)

- install or remove dev dependencies / modify lockfiles
- local database migrations
<!-- add task-specific items -->

### Human-only (deny - the agent never executes these; they go through human-todo.md and a human runs them personally)

- git push, git reset --hard, destructive git
- production deploys
- modify secrets or environment files
- modify CI/CD
- network access for project-changing work
- delete many files
- change public API

## Notes
````

---

### `powerpuff/human-todo.md`

````markdown
# Human TODO

This is the human-execution surface for the Powerpuff agent workflow.

Operations follow a three-tier model:

- **ask tier (medium risk)** - in interactive sessions the harness prompts you directly; answering the prompt is the approval and no TODO is needed. Items land here only when no human was present to answer the prompt.
- **deny tier (high risk / irreversible)** - the agent can never run these. It writes the exact command here, and **you run it yourself in a regular terminal** (outside any agent session), then record the result.

There is no approval-commit ceremony: the agent has no capability to run these operations, so there is nothing to forge.

## How to respond

For a deny-tier TODO: run the command yourself, replace `PENDING` with the result, and move the item to Resolved.

For an ask-tier TODO left over from an unattended run: either run it yourself (record `DONE`), or restart the agent interactively and answer the prompt when it re-triggers.

Valid responses:

```
DONE <what you ran and the result>
REJECT <direction>
ASK <question or direction>
DEFER <optional note>
```

Each TODO is one-time and bound to the plan state it cites. Agents verify the resulting environment state (lockfile changed, package importable, branch on remote), not this file's text.

---

## Open

<!-- Agents add new TODOs here. Example:

### TODO-001 - Push feature branch

- Tier: deny (human-only)
- Task: openspec/changes/auth-test-fix/
- Requested by: Bubbles
- Blocks: review handoff
- Created: YYYY-MM-DD
- Plan state: <commit SHA of the scope.md / plan this request belongs to>

#### Command

Run in a regular terminal:

```bash
git push -u origin feature/auth-test-fix
```

#### Why

Review happens from the remote branch.

#### How the agent verifies completion

`git ls-remote origin feature/auth-test-fix` returns the branch.

#### Human Response

```
PENDING
```

-->

## Resolved

<!-- Completed, rejected, or deferred TODOs. -->
````

---

### `powerpuff/kotodute.md`

````markdown
# Kotodute - Handoff Format

Role handoffs (`handoff.koto`) use Kotodute: a machine-first S-expression format for
agent-to-agent state transfer. It is data, not executable Lisp - never evaluate it.
Human surfaces (`scope.md`, `human-todo.md`) stay markdown; only handoffs use Kotodute.

## Root Form

Required top-level nodes: `(v 0.1)`, `(goal ...)`, `(state ...)`, `(next ...)`.

    (kotodute
      (v 0.1)
      (goal (desired end state as a phrase))
      (state (owner <role>) (status <enum>) ...)
      (next (do (next action)) (done when (completion condition))))

## Operators

- `(facts ...)` - verified claims; attach `(evidence (file path))` or `(evidence (command "..."))`
- `(assumptions ...)` - provisional claims, with `(basis ...)`
- `(decisions ...)` - `(choose ...)` `(because ...)`, optional `(reject ...)`
- `(risks ...)` - `(condition ...)` `(outcome ...)` `(severity ...)` `(mitigation ...)`
- `(open ...)` - unanswered questions
- `(blockers ...)` - missing input that prevents progress; reference human-todo ids
- `(note ...)` - rare natural-language escape hatch

## Writing Rules

- Phrase nodes for semantic content: `(goal (tests pass on ci))`, not `(goal tests-pass-on-ci)`.
- Hyphenated tokens only for ids, enums, statuses, paths: `(status in-progress)`, `(id b1)`.
- Separate facts from assumptions; never hide uncertainty in compact wording.
- Append new facts/decisions/evidence; replace only stale `(state ...)` and `(next ...)`.
- Strings for exact text or command output: `(evidence (command "npm test -- login"))`.
- `;` starts a comment.

## Update Discipline

Read: parse the root, then `(goal)` `(state)` `(next)` first, then scan `(blockers)` and
`(open)`; treat assumptions as provisional. Write: update `(state)`, append evidence-backed
facts, replace `(next)`, then validate:

    python3 powerpuff/scripts/koto-check.py powerpuff/<role>/handoff.koto

A handoff that fails validation must be repaired before the session ends. Readers validate
a handoff before trusting it.
````

---

### `powerpuff/scripts/koto-check.py`

```python
#!/usr/bin/env python3
"""koto-check: minimal structural validator for Kotodute handoff files.

Checks balanced forms, the (kotodute ...) root, and required top-level nodes.
Semantic judgment stays with the agent. If the full kotodute skill is installed,
its kotodute_check.py (with --format) may be used instead.
"""
import sys


def check(text):
    # strip strings and ; comments
    out, i, n = [], 0, len(text)
    while i < n:
        c = text[i]
        if c == '"':
            j = i + 1
            while j < n and text[j] != '"':
                j += 2 if text[j] == "\\" else 1
            i = j + 1
        elif c == ";":
            while i < n and text[i] != "\n":
                i += 1
        else:
            out.append(c)
            i += 1
    s = "".join(out)
    depth = 0
    for c in s:
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth < 0:
                return "unbalanced: extra )"
    if depth != 0:
        return f"unbalanced: {depth} unclosed ("
    body = s.strip()
    if not body.startswith("(kotodute"):
        return "root must be (kotodute ...)"
    for node in ("(v ", "(goal", "(state", "(next"):
        if node not in body:
            return f"missing required node {node.strip('( ')}"
    return None


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: koto-check.py <file>")
        sys.exit(2)
    err = check(open(sys.argv[1]).read())
    if err:
        print(f"koto-check: {sys.argv[1]}: {err}")
        sys.exit(1)
    print(f"koto-check: {sys.argv[1]}: ok")
```

---

### `powerpuff/archive/.gitkeep`

Create an empty file at `powerpuff/archive/.gitkeep`.

---

## Step 5 - Create the enforcement layer

Prompts alone are an honour system. This step adds runtime enforcement: a three-tier permission model (`allow` / `ask` / `deny`) plus a bash guard hook.

| Tier | Meaning | Examples |
|---|---|---|
| allow | Normal work, no friction | edit code, run tests, git status / diff / commit |
| ask | Medium risk, reversible. The harness prompts the human, who approves with one keypress. The prompt itself is the human approval - the agent cannot forge it. | install/remove dev dependencies, lockfile changes, local DB migrations |
| deny | High risk or irreversible. The agent can never run these; the human runs them personally via `powerpuff/human-todo.md`. | git push, destructive git, deploys, secrets, CI/CD, mass deletion |

### `.claude/settings.json`

If the file already exists, merge these keys into it instead of overwriting.

```json
{
  "permissions": {
    "ask": [
      "Bash(npm install:*)",
      "Bash(npm uninstall:*)",
      "Bash(yarn add:*)",
      "Bash(pnpm add:*)",
      "Bash(pip install:*)"
    ],
    "deny": [
      "Bash(git push:*)",
      "Bash(git reset --hard:*)",
      "Bash(git clean:*)",
      "Bash(git filter-branch:*)",
      "Read(./.env)",
      "Edit(./.env)",
      "Write(./.env)",
      "Edit(./.github/workflows/**)",
      "Write(./.github/workflows/**)",
      "Edit(./.claude/settings.json)",
      "Write(./.claude/settings.json)",
      "Edit(./.claude/hooks/**)",
      "Write(./.claude/hooks/**)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/powerpuff-guard.sh" }
        ]
      }
    ]
  }
}
```

Adjust the `ask` list to the project's package manager and tooling. The `deny` entries protecting `.claude/` itself are what stop an agent from editing the rules to unlock itself.

### `.claude/hooks/powerpuff-guard.sh`

Permission rules govern the Edit/Write tools; this hook closes the bash side-door (`sed -i`, `>` redirection, `python -c`, ...) for protected paths, and backstops the deny tier.

```bash
#!/bin/bash
# powerpuff-guard: blocks bash access to protected paths and human-only commands.
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

deny() { echo "powerpuff-guard: blocked - $1" >&2; exit 2; }

# Human-only commands (deny tier)
printf '%s' "$cmd" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+push'  && deny "git push is human-only; add a TODO to powerpuff/human-todo.md"
printf '%s' "$cmd" | grep -qE 'git[[:space:]]+reset[[:space:]]+--hard' && deny "git reset --hard is human-only"
printf '%s' "$cmd" | grep -qE 'git[[:space:]]+(clean|filter-branch)'   && deny "destructive git is human-only"

# Protected paths: no bash access at all - file changes must go through the Edit/Write
# tools, which the permission rules govern and the transcript records.
for p in 'powerpuff/task/scope\.md' 'powerpuff/human-todo\.md' '\.claude/' '\.opencode/'; do
  printf '%s' "$cmd" | grep -qE "$p" && deny "bash access to protected path; use the Edit tool"
done

exit 0
```

Known limits, by design:

- String matching is best-effort; a determined adversary can obfuscate. The layers that do not depend on it: the deny tier's real anchor is **credential isolation** - keep push keys and signing keys out of the agent's environment (hardware key or an SSH agent that prompts per use) - plus Buttercup's git checks after the fact.
- `scope.md` cannot be path-denied per role here (Blossom must edit it during planning). Enforcement is temporal instead: the hook blocks bash writes, and Buttercup verifies via git history that `scope.md` did not change during execution (see the review checklist).

### Security test

Run once after setup, in a fresh agent session:

1. Ask the agent to `git push` - must be blocked.
2. Ask the agent to append a line to `powerpuff/task/scope.md` via `bash echo >>` - must be blocked.
3. Ask the agent to install a package - must surface an ask prompt, not run silently.

If any of these pass through, fix the rules before doing real work.

---

## Step 6 - Create Claude Code and OpenCode command entries

Create the directory for Claude Code in the project root if it does not exist.

```bash
mkdir -p .claude/commands
```

Then create the following files for Claude Code:

### `.claude/commands/blossom.md`

```markdown
You are the Planner (Blossom) in this project's Powerpuff agent workflow.
Read `powerpuff/blossom/warm-up.md` and follow its instructions.
```

### `.claude/commands/ppg-plan.md`

```markdown
You are the Planner (Blossom) in this project's Powerpuff agent workflow.
Read `powerpuff/blossom/warm-up.md` and follow its instructions.
```

### `.claude/commands/bubbles.md`

```markdown
You are the Executor (Bubbles) in this project's Powerpuff agent workflow.
Read `powerpuff/bubbles/warm-up.md` and follow its instructions.
```

### `.claude/commands/ppg-exec.md`

```markdown
You are the Executor (Bubbles) in this project's Powerpuff agent workflow.
Read `powerpuff/bubbles/warm-up.md` and follow its instructions.
```

### `.claude/commands/buttercup.md`

```markdown
You are the Reviewer (Buttercup) in this project's Powerpuff agent workflow.
Read `powerpuff/buttercup/warm-up.md` and follow its instructions.
```

### `.claude/commands/ppg-review.md`

```markdown
You are the Reviewer (Buttercup) in this project's Powerpuff agent workflow.
Read `powerpuff/buttercup/warm-up.md` and follow its instructions.
```

### `.claude/commands/ppg.md`

```markdown
Powerpuff Girls agent workflow - role reference:

| Command | Alias | Role | Responsibility |
|---|---|---|---|
| /blossom | /ppg-plan | Planner | Creates task scope, coordinates decisions |
| /bubbles | /ppg-exec | Executor | Implements the task |
| /buttercup | /ppg-review | Reviewer | Verifies output against spec and policy |

Run the command for the role you need to start a session.
```

### For OpenCode

Then create matching OpenCode commands as symbolic links to the Claude Code command files.

Use a guarded symlink setup so existing real files are not overwritten:

```bash
mkdir -p .opencode/commands

for command in \
  blossom.md \
  ppg-plan.md \
  bubbles.md \
  ppg-exec.md \
  buttercup.md \
  ppg-review.md \
  ppg.md
do
  target=".opencode/commands/$command"
  source="../../.claude/commands/$command"

  if [ ! -e ".claude/commands/$command" ]; then
    echo "SKIP: .claude/commands/$command does not exist"
    continue
  fi

  if [ -L "$target" ]; then
    rm "$target"
    ln -s "$source" "$target"
  elif [ -e "$target" ]; then
    echo "SKIP: $target already exists and is not a symlink"
  else
    ln -s "$source" "$target"
  fi
done
```

The OpenCode links point back to `.claude/commands/` so Claude Code and OpenCode share the same command definitions.

If a command file already exists in `.opencode/commands/` and is not a symlink, do not overwrite it automatically. Report it as an issue in Step 7.

---

## Step 7 - Report

After completing all steps, report:

- OpenSpec version installed (or whether it was missing)
- Whether `openspec/` exists in the project root
- List of directories and files created under `powerpuff/` (including `kotodute.md`, `scripts/koto-check.py`, and the `handoff.koto` files)
- Whether `.claude/settings.json` was created or merged, and `.claude/hooks/powerpuff-guard.sh` created
- List of `.claude/commands/` files created
- List of `.opencode/commands/` symlinks created or skipped
- A reminder to run the Step 5 security test once before doing real work
- Any issues encountered
