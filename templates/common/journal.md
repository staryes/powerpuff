# Project Journal — YYYY-MM

Append-only project chronology. The serialized entry owner writes shared entries; parallel or advisory children write run-local Koto and the owner aggregates their result.

## Entry Types

- `WORK` — implementation, verification, or workflow activity
- `DECISION` — important scope, architecture, workflow, contract, or priority choice
- `ISSUE` — durable issue opened, changed, or resolved
- `APPROVAL` — human approval or rejection that changes execution state

Required heading:

```text
### YYYY-MM-DD HH:MM TZ — <WORK|DECISION|ISSUE|APPROVAL> — [<owner>] [<task-id>]
```

Decisions are immutable. If a decision changes, append a new `DECISION` entry and reference the superseded entry.

## Entries

<!--
### YYYY-MM-DD HH:MM TZ — WORK — [lily] [task-id]

- Summary:
- Evidence:
- Result:
-->
