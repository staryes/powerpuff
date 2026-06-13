# Human TODO

This is the human-execution surface for the Powerpuff agent workflow.

Operations follow a three-tier model:

- **ask tier (medium risk)** - in interactive sessions the harness prompts you directly; answering the prompt is the approval and no TODO is needed. Items land here only when no human was present to answer the prompt.
- **deny tier (high risk / irreversible)** - agents can never run these. The agent writes the exact command here, and **you run it yourself in a regular terminal** (outside any agent session), then record the result.

There is no approval-commit ceremony: agents have no capability to run these operations, so there is nothing to forge.

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

In parallel (vibe) mode, TODO ids are prefixed with the run's `<task-id>` (e.g. `TODO-<task-id>-001`)
to avoid collisions between concurrent runs. Misato aggregates PENDING items across runs and
presents them to you in one batch.

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
