Powerpuff Girls agent workflow - role reference:

| Command | Role | Responsibility |
|---|---|---|
| /misato | Orchestrator | Splits + routes work, fans out / collects / merges (Vibe-native) |
| /blossom | Planner | Defines scope: I/O contract + verification items |
| /bubbles | Executor | Implements the task, self-tests against the spec |
| /buttercup | Reviewer | Verifies output against spec and policy |
| /lily-plan /lily-exec /lily-check | Lightweight | Small-change end-to-end workflow |

Framework: `./powerpuff/`. Working dir: `./kotodute/` (handoffs in `kotodute/handoff/*.koto`, Kotodute format).
Run the command for the role you need to start a session.
