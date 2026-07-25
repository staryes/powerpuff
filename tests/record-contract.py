#!/usr/bin/env python3
"""Offline regression checks for the shared Powerpuff record contract."""

from __future__ import annotations

import datetime as dt
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
PPG = ROOT / "ppg"
EXTENSION = ROOT / "templates/pi/extensions/powerpuff.ts"


def run(*args: str, cwd: pathlib.Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=cwd,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def test_fresh_attach_and_reattach() -> None:
    month = dt.datetime.now().astimezone().strftime("%Y-%m")
    with tempfile.TemporaryDirectory(prefix="ppg-record-contract-") as raw:
        target = pathlib.Path(raw)
        run("git", "init", "-q", cwd=target)
        (target / "powerpuff").symlink_to(ROOT, target_is_directory=True)

        command = (
            str(target / "powerpuff/ppg"),
            "attach",
            "--target",
            str(target),
            "--harness",
            "claude,pi",
            "--girls",
            "misato,lily",
            "--mode",
            "tracked",
            "--yes",
        )
        run(*command)

        shared = [
            "issues.md",
            f"journals/{month}.md",
            "handoff.md",
            "human-todo.md",
            "run-log.md",
        ]
        for relative in shared:
            require((target / "kotodute" / relative).is_file(), f"missing shared record: {relative}")

        for relative in ["task.md", "state.md", "motoko-scope.md"]:
            require((target / "kotodute/lily" / relative).is_file(), f"missing Lily state: {relative}")

        for relative in ["issues.md", "handoff.md", "human-todo.md", "work-log.md"]:
            require(not (target / "kotodute/lily" / relative).exists(), f"fresh attach created legacy {relative}")
        require(not (target / "kotodute/lily/journals").exists(), "fresh attach created legacy journals")

        journal = (target / f"kotodute/journals/{month}.md").read_text()
        for entry_type in ["WORK", "DECISION", "ISSUE", "APPROVAL"]:
            require(f"`{entry_type}`" in journal, f"journal omits {entry_type}")
        require("### YYYY-MM-DD HH:MM TZ — <WORK|DECISION|ISSUE|APPROVAL> —" in journal, "journal heading contract missing")

        handoff = (target / "kotodute/handoff.md").read_text()
        fields = [
            "Current owner:",
            "Current task:",
            "Status:",
            "Source:",
            "Active blocker / human item:",
            "Next action:",
        ]
        require(all(field in handoff for field in fields), "shared handoff fields incomplete")

        sentinels = {
            "kotodute/issues.md": "sentinel issues\n",
            f"kotodute/journals/{month}.md": "sentinel journal\n",
            "kotodute/handoff.md": "sentinel handoff\n",
            "kotodute/human-todo.md": "sentinel todo\n",
            "kotodute/run-log.md": "sentinel run log\n",
            "kotodute/lily/task.md": "sentinel task\n",
            "kotodute/lily/state.md": "sentinel state\n",
            "kotodute/lily/motoko-scope.md": "sentinel scope\n",
        }
        for relative, content in sentinels.items():
            (target / relative).write_text(content)

        legacy = target / "kotodute/lily/issues.md"
        legacy.write_text("legacy must survive\n")
        second = run(*command)
        require("legacy Lily records detected" in second.stdout, "legacy records were not reported")
        require(legacy.read_text() == "legacy must survive\n", "legacy record was overwritten")
        for relative, content in sentinels.items():
            require((target / relative).read_text() == content, f"reattach overwrote {relative}")

        run(str(target / "powerpuff/ppg"), "doctor", "--target", str(target))
        manifest = (target / "kotodute/.ppg-manifest").read_text()
        require("meta version 0.5.0" in manifest, "manifest version was not bumped")

        lily_skill = (target / ".pi/skills/ppg-lily/SKILL.md").read_text()
        motoko_skill = (target / ".pi/skills/ppg-motoko/SKILL.md").read_text()
        require("kotodute/handoff.md" in lily_skill and "lily/state.md" in lily_skill, "generated Lily skill is stale")
        require("project-shared journal" in motoko_skill and "lily/state.md" in motoko_skill, "generated Motoko skill is stale")


def test_extension_contract() -> None:
    source = EXTENSION.read_text()
    status_start = source.index("function readLilyStatus")
    status_end = source.index("function readMotokoScopeStatus", status_start)
    status_parser = source[status_start:status_end]
    require('"kotodute/lily/state.md"' in status_parser, "status parser does not use Lily state")
    require("handoff.md" not in status_parser, "status parser falls back to a handoff")
    require("currentJournalPath()" in source, "takeover journal path is not month-bounded")
    require('"kotodute/issues.md"' in source, "shared issues permission missing")
    require('"kotodute/handoff.md"' in source, "shared handoff permission missing")
    require('relative.startsWith("kotodute/journals/")' in source, "coding-child shared journal deny missing")
    require("motokoTakeoverApproval = null" in source, "single-use approval consumption missing")
    require("Date.now() + 10 * 60 * 1000" in source, "approval expiry changed")


def main() -> None:
    test_fresh_attach_and_reattach()
    test_extension_contract()
    print("RECORD CONTRACT: PASS")


if __name__ == "__main__":
    main()
