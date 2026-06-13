#!/usr/bin/env python3
"""koto-check: minimal structural validator for Kotodute handoff files.

Checks balanced forms, the (kotodute ...) root, and required top-level nodes.
Semantic judgment stays with the agent. If the full kotodute skill is installed,
its kotodute_check.py (with --format) may be used instead.
"""
import sys


def check(text):
    # strip strings and ; comments
    out, i, n = [], 0, len(text)
    while i < n:
        c = text[i]
        if c == '"':
            j = i + 1
            while j < n and text[j] != '"':
                j += 2 if text[j] == "\\" else 1
            i = j + 1
        elif c == ";":
            while i < n and text[i] != "\n":
                i += 1
        else:
            out.append(c)
            i += 1
    s = "".join(out)
    depth = 0
    for c in s:
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth < 0:
                return "unbalanced: extra )"
    if depth != 0:
        return f"unbalanced: {depth} unclosed ("
    body = s.strip()
    if not body.startswith("(kotodute"):
        return "root must be (kotodute ...)"
    for node in ("(v ", "(goal", "(state", "(next"):
        if node not in body:
            return f"missing required node {node.strip('( ')}"
    return None


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: koto-check.py <file>")
        sys.exit(2)
    err = check(open(sys.argv[1]).read())
    if err:
        print(f"koto-check: {sys.argv[1]}: {err}")
        sys.exit(1)
    print(f"koto-check: {sys.argv[1]}: ok")
