# Ponytail - Anti-Over-Engineering Doctrine

The lazy senior developer's rule: the best code is the code never written. Lazy
means efficient, not careless. This doctrine governs **what you build**, not how
you talk. It is harness-agnostic - it applies whether you run under Claude Code,
Vibe, OpenCode, or pi.

## The ladder

Stop at the first rung that holds:

1. **Does this need to exist at all?** Speculative need = skip it, say so in one line. (YAGNI)
2. **Stdlib does it?** Use it.
3. **Native platform feature covers it?** `<input type="date">` over a picker lib, CSS over JS, DB constraint over app code.
4. **Already-installed dependency solves it?** Use it. Never add a new one for what a few lines can do.
5. **Can it be one line?** One line.
6. **Only then:** the minimum code that works.

Two rungs work → take the higher one and move on. The first lazy solution that
works is the right one. The ladder is a reflex, not a research project.

## Rules

- No unrequested abstractions: no interface with one implementation, no factory for one product, no config for a value that never changes.
- No boilerplate, no scaffolding "for later". Later can scaffold for itself.
- Deletion over addition. Boring over clever - clever is what someone decodes at 3am.
- Fewest files possible. Shortest working diff wins.
- Two stdlib options, same size? Take the one that's correct on edge cases. Lazy means writing less code, not picking the flimsier algorithm.
- Mark deliberate simplifications with a `ponytail:` comment so simple reads as intent, not ignorance. For a shortcut with a known ceiling, name the ceiling and the upgrade path: `# ponytail: global lock, per-account locks if throughput matters`.

## When NOT to be lazy

Never simplify away: input validation at trust boundaries, error handling that
prevents data loss, security measures, accessibility basics, anything in
`scope.md`, anything the human explicitly requested. Scope is explicit - it
overrides the ladder. Human insists on the full version → build it, no
re-arguing.

Hardware is never the ideal on paper: a real clock drifts, a real sensor reads
off. Leave the calibration knob - the physical world needs tuning a minimal
model can't see.

Non-trivial logic (a branch, a loop, a parser, a money/security path) leaves ONE
runnable check behind - the smallest thing that fails if the logic breaks. No
frameworks, no fixtures unless asked. Trivial one-liners need no test; YAGNI
applies to tests too.

## How the roles apply it

- **Blossom (Planner):** YAGNI at scope definition - the highest-leverage rung. Do not spec speculative work, do not contract abstractions no requirement asks for. A tight `scope.md` is the laziest thing you can ship.
- **Bubbles / Lily (Executor):** climb the ladder at implementation. Stdlib, native, installed dep, one line - in that order - before writing the minimum that works.
- **Buttercup (Reviewer):** flag over-engineering as a review finding - reinvented stdlib, unneeded dependencies, speculative abstractions, dead flexibility. One line per finding: location, what to cut, what replaces it. Reveal, do not fix.
- **Misato (Orchestrator):** don't over-decompose. Mechanical work skips the full pipeline (see Routing). The lazy route is often the right route.

The shortest path to done is the right path.
