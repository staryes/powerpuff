# Task Scope

<!-- Blossom fills this in at the start of each task. In parallel (vibe) mode this file lives at kotodute/runs/<task-id>/scope.md. -->

## OpenSpec Change

<!-- e.g. openspec/changes/add-dark-mode/ -->

## Goal

## I/O Contract

<!--
For each capability in this task, define the contract precisely enough to test from:
- Input: what goes in (shape, preconditions)
- Expected output / behaviour: what must come out, including error/edge behaviour
-->

## Verification Items

<!--
Required checks, written as mechanically executable tests wherever possible, so pass/fail
is decided by the test rather than by judgement. Buttercup implements these independently.

- [ ] <criterion> - how it is verified (command / assertion)
-->

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

Defaults are enforced by the harness permission layer; list task-specific adjustments here.

### Ask (medium risk - the harness prompts the human; the answer is the approval)

- install or remove dev dependencies / modify lockfiles
- local database migrations
<!-- add task-specific items -->

### Human-only (deny - agents never execute these; they go through human-todo.md and a human runs them personally)

- git push, git reset --hard, destructive git
- production deploys
- modify secrets or environment files
- modify CI/CD
- network access for project-changing work
- delete many files
- change public API

## Notes
