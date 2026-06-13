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
