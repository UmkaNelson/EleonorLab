#!/usr/bin/env python3
"""Ensure hreflang and x-default alternate links exist on every HTML page."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent

CANONICAL_RE = re.compile(
    r'(<link\s+rel="canonical"\s+href="([^"]+)"\s*/?>)',
    re.IGNORECASE,
)
HREFLANG_LINE_RE = re.compile(
    r"(?:\r?\n)?\s*<link\s+rel=\"alternate\"\s+hreflang=\"[^\"]+\"\s+href=\"[^\"]+\"\s*/?>",
    re.IGNORECASE,
)


def sync_file(path: Path) -> bool:
    raw = path.read_bytes()
    newline = "\r\n" if b"\r\n" in raw else "\n"
    text = raw.decode("utf-8")
    original = text

    # Remove stale hreflang entries first.
    text = HREFLANG_LINE_RE.sub("", text)

    match = CANONICAL_RE.search(text)
    if not match:
        return False

    canonical_tag, canonical_url = match.group(1), match.group(2)
    insertion = (
        f"{canonical_tag}{newline}"
        f'    <link rel="alternate" hreflang="ru-RU" href="{canonical_url}">{newline}'
        f'    <link rel="alternate" hreflang="x-default" href="{canonical_url}">'
    )
    text = text.replace(canonical_tag, insertion, 1)

    if text != original:
        with path.open("w", encoding="utf-8", newline="") as fp:
            fp.write(text)
        return True
    return False


def main() -> None:
    changed = 0
    for page in sorted(ROOT.glob("*.html")):
        if page.name.startswith("__"):
            continue
        if sync_file(page):
            changed += 1
    print(f"Updated hreflang on {changed} pages.")


if __name__ == "__main__":
    main()
