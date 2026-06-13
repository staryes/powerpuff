Powerpuff Girls agent workflow - role reference:

| Command | Role | Responsibility |
|---|---|---|
| /misato | Orchestrator | Splits + routes work, fans out / collects / merges (Vibe-native) |
| /blossom | Planner | Defines scope: I/O contract + verification items |
| /bubbles | Executor | Implements the task, self-tests against the spec |
| /buttercup | Reviewer | Verifies output against spec and policy |
| /lily-plan /lily-exec /lily-check | Lightweight | Small-change end-to-end workflow |

Run the command for the role you need to start a session. Role handoffs use the Kotodute format (`powerpuff/kotodute.md`).
