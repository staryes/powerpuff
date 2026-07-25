# Run Log

<!--
Append-only routing memory. One row per completed or escalated task.

Purpose: back the human's sense of "how often" with a record. The human's feel
decides entry points and routing policy; this log keeps that feel honest and
lets lessons accumulate as rubric cases instead of being re-learned.

Misato appends a row when a run completes. Lily appends a row when a task
completes or escalates. Humans prune and curate. This is a memory aid, not a
metrics system - resist the urge to add fields.
-->

## Lessons (rubric cases)

<!--
One line per lesson, newest last. Misato or Lily may PROPOSE a line when
hindsight shows a routing miss; the human keeps, edits, or deletes it.
Misato reads this section before routing.

Format: - <situation> → <right route> (<why>)
-->

## Runs

<!--
Columns:
  entry     lily | misato
  lane      direct | fast | full   (misato only; lily rows use "lily")
  cycles    review cycles consumed (implementation retries)
  findings  finding types raised (impl/contract/req/arch/human), or "-"
  esc       escalated? no | motoko | rerouted-to-misato
  hindsight one short phrase: was the entry/lane right in retrospect?
-->

| date | task | entry | lane | cycles | findings | esc | outcome | hindsight |
|---|---|---|---|---|---|---|---|---|
