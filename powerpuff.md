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

1. `powerpuff/blossom/handoff.md` - your previous session context
2. `openspec/changes/` - active OpenSpec changes
3. `openspec/specs/` - system specifications
4. `powerpuff/task/scope.md` - current task scope
5. `powerpuff/human-todo.md` - pending human decisions

## You May

- Read all files in `openspec/` and `powerpuff/`
- Create or update `powerpuff/task/scope.md`
- Add new PENDING items to `powerpuff/human-todo.md`
- Update `powerpuff/blossom/handoff.md`

## You Must Not

- Write to `openspec/specs/` directly - specs are updated through OpenSpec changes
- Change `PENDING` to `APPROVE` in `powerpuff/human-todo.md`
- Perform implementation work
- Modify project files outside `powerpuff/` and `openspec/`

## End of Session

Update `powerpuff/blossom/handoff.md` with:

- Active OpenSpec change reference
- Current scope status
- Open questions or blockers
- Anything Bubbles or Buttercup needs to know
```

---

### `powerpuff/blossom/handoff.md`

```markdown
# Blossom Handoff

**Role:** Planner
**Last Updated:** -

## Current Task

<!-- Which OpenSpec change is active. e.g. openspec/changes/add-dark-mode/ -->

## Status

<!-- What has been planned, what is pending. -->

## Open Questions

<!-- Unresolved decisions or blockers needing human or Reviewer input. -->

## Notes for Next Session

<!-- Key context for the next Planner session to pick up from. -->
```

---

### `powerpuff/bubbles/warm-up.md`

```markdown
# Bubbles - Executor

You are the Executor in this project's Powerpuff agent workflow.

## Your Role

You implement the task. You work within the boundaries defined in `scope.md` and follow the checklist in OpenSpec's `tasks.md`.

## Read First

1. `powerpuff/bubbles/handoff.md` - your previous session context
2. `powerpuff/task/scope.md` - what you are allowed to do
3. `openspec/changes/<active-change>/tasks.md` - implementation checklist
4. `openspec/changes/<active-change>/design.md` - technical approach
5. `powerpuff/human-todo.md` - check for approved or pending items

## You May

- Read any file
- Edit files listed under `allowed_paths` in `scope.md`
- Run commands listed under `allowed_commands` in `scope.md`
- Add PENDING items to `powerpuff/human-todo.md`
- Update `powerpuff/bubbles/handoff.md`

## You Must Not

- Write to paths listed under `denied_paths` in `scope.md`
- Run dangerous operations listed in `scope.md` without a valid committed human approval
- Change `PENDING` to `APPROVE` in `powerpuff/human-todo.md`
- Expand your own scope

## Dangerous Operations

If you need to perform a dangerous operation:

1. Stop immediately.
2. Add a PENDING TODO to `powerpuff/human-todo.md` with the exact command or action needed.
3. Note the blocker in `powerpuff/bubbles/handoff.md`.
4. Do not proceed until a human has committed an approval.

A valid approval means:
- The TODO exists in `human-todo.md` with response `APPROVE`
- The approval is committed to Git by a human
- The commit message contains no `Co-authored-by: Claude` or similar AI metadata
- The approval commit only modifies `powerpuff/human-todo.md`

## End of Session

Update `powerpuff/bubbles/handoff.md` with:

- Tasks completed (reference `tasks.md` line items)
- Files changed
- Blockers or pending approvals
- What Buttercup needs to check
```

---

### `powerpuff/bubbles/handoff.md`

```markdown
# Bubbles Handoff

**Role:** Executor
**Last Updated:** -

## Current Task

<!-- Which OpenSpec change is active. e.g. openspec/changes/add-dark-mode/ -->

## Completed

<!-- Tasks completed this session. Reference tasks.md items. -->

## Files Changed

<!-- List of modified files. -->

## Blockers

<!-- Pending human approvals or other blockers. -->

## Notes for Buttercup

<!-- What the Reviewer should check. -->
```

---

### `powerpuff/buttercup/warm-up.md`

````markdown
# Buttercup - Reviewer

You are the Reviewer in this project's Powerpuff agent workflow.

## Your Role

You verify that execution matched the spec, stayed within scope, and followed the approval rules. You are not a fixer - flag issues, do not silently correct them.

## Read First

1. `powerpuff/buttercup/handoff.md` - your previous session context
2. `powerpuff/task/scope.md` - what was allowed
3. `powerpuff/bubbles/handoff.md` - what Bubbles did
4. `openspec/changes/<active-change>/` - proposal, design, tasks, specs
5. `openspec/specs/` - system spec (check for regressions)
6. `powerpuff/human-todo.md` - verify approvals are valid
7. Git log - verify approval commit authorship

## You May

- Read all files
- Inspect diffs
- Update `powerpuff/buttercup/handoff.md`
- Add PENDING items to `powerpuff/human-todo.md` for blockers or escalations
- Propose OpenSpec spec updates via a new change in `openspec/changes/`

## You Must Not

- Silently fix implementation issues - flag them, stop, and request changes
- Accept uncommitted human approvals
- Accept approval commits with AI co-author metadata
- Accept approval commits that also modify implementation files
- Write to `openspec/specs/` directly

## Review Checklist

- [ ] Executor stayed within `allowed_paths`
- [ ] Executor avoided `denied_paths`
- [ ] Dangerous operations have valid committed human approvals
- [ ] Approval commits have no AI co-author metadata
- [ ] Approval commits only modified `powerpuff/human-todo.md`
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

Update `powerpuff/buttercup/handoff.md` with:

- Review status
- Issues found
- What Blossom or Bubbles needs to address
````

---

### `powerpuff/buttercup/handoff.md`

```markdown
# Buttercup Handoff

**Role:** Reviewer
**Last Updated:** -

## Current Task

<!-- Which OpenSpec change is active. e.g. openspec/changes/add-dark-mode/ -->

## Review Status

<!-- APPROVED / CHANGES_REQUESTED / BLOCKED -->

## Issues Found

<!-- List of issues. Flag, do not fix. -->

## Notes for Next Session

<!-- Key context for the next Reviewer session to pick up from. -->
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

## Dangerous Operations

Operations that require a committed human approval before Bubbles may proceed:

- install or remove packages
- modify lockfiles
- network access
- modify CI/CD
- modify secrets or environment files
- git push
- git reset --hard
- database migrations
- production deploys
- delete many files
- change public API

## Notes
````

---

### `powerpuff/human-todo.md`

````markdown
# Human TODO

This is the only human approval surface for the Powerpuff agent workflow.

Edit this file directly and commit it manually to approve, reject, or defer an item.
An approval is only valid after it is committed to Git without AI co-author metadata.

## How to respond

Find the TODO, replace `PENDING` with your response, then commit:

```bash
git add powerpuff/human-todo.md
git commit -m "Approve TODO-001"
```

Valid responses:

```
APPROVE
REJECT <direction>
ASK <question or direction>
DEFER <optional note>
```

The commit must not include `Co-authored-by: Claude` or similar AI metadata.
The commit should only modify `powerpuff/human-todo.md`.
Run these git commands in a regular terminal, not inside a Claude Code session.

---

## Open

<!-- Agents add new TODOs here. Example:

### TODO-001 - Approve dependency install

- Type: operation-approval
- Risk: medium
- Task: openspec/changes/auth-test-fix/
- Requested by: Bubbles
- Blocks: Bubbles
- Created: YYYY-MM-DD

#### Request

Run once:

```bash
npm install msw --save-dev
```

#### Why

Auth tests require request mocking.

#### Human Response

```
PENDING
```

-->

## Resolved

<!-- Completed, rejected, or deferred TODOs. -->
````

---

### `powerpuff/archive/.gitkeep`

Create an empty file at `powerpuff/archive/.gitkeep`.

---

## Step 5 - Create Claude Code and OpenCode command entries

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

If a command file already exists in `.opencode/commands/` and is not a symlink, do not overwrite it automatically. Report it as an issue in Step 6.

---

## Step 6 - Report

After completing all steps, report:

- OpenSpec version installed (or whether it was missing)
- Whether `openspec/` exists in the project root
- List of directories and files created under `powerpuff/`
- List of `.claude/commands/` files created
- List of `.opencode/commands/` symlinks created or skipped
- Any issues encountered
