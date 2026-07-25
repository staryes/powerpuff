# Motoko Execution Scope

**Status:** NOT_PROPOSED
**Prepared From:** reconnaissance
**Approved By:** pending user-invoked `/motoko-execute`

## Problem Restatement

## Evidence and Root Cause

## Assumptions

## Allowed Files / Areas

```text
# Exact files, directories, or modules Motoko may modify during execution.
```

## Denied Files / Areas

```text
.env
secrets/**
.git/**
.github/workflows/**
powerpuff/**
.pi/**
.vibe/**
.claude/**
.opencode/**
openspec/specs/**
kotodute/lily/task.md
kotodute/lily/motoko-scope.md
```

## Allowed Commands

```text
# Exact, single commands. No pipes, redirects, command substitution, or shell composition.
git status
git diff
```

## Implementation Plan

- [ ]

## Check Plan

- [ ] Review diff for unrelated changes
- [ ] Run allowed checks
- [ ] Confirm acceptance criteria from `kotodute/lily/task.md`

## Risks and Rollback

## Unresolved Questions
