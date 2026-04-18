#!/usr/bin/env python3
"""Ensure hreflang and x-default alternate links exist on canonical HTML pages."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
EXCLUDED_DIRS = {
    '.git',
    'assets',
    'css',
    'js',
    'font',
    'scripts',
    '__pycache__',
}

CANONICAL_RE = re.compile(
    r'(<link\s+rel="canonical"\s+href="([^"]+)"\s*/?>)',
    re.IGNORECASE,
)
HREFLANG_LINE_RE = re.compile(
    r'(?:\r?\n)?\s*<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+"\s*/?>',
    re.IGNORECASE,
)


def iter_pages() -> list[Path]:
    pages: list[Path] = []

    root_index = ROOT / 'index.html'
    if root_index.exists():
        pages.append(root_index)

    for page in sorted(ROOT.glob('*/index.html'), key=lambda p: p.parent.name):
        parent = page.parent.name
        if parent in EXCLUDED_DIRS or parent.startswith('.') or parent.startswith('__'):
            continue
        pages.append(page)

    return pages


def sync_file(path: Path) -> bool:
    raw = path.read_bytes()
    newline = '\r\n' if b'\r\n' in raw else '\n'
    text = raw.decode('utf-8')
    original = text

    text = HREFLANG_LINE_RE.sub('', text)

    match = CANONICAL_RE.search(text)
    if not match:
        return False

    canonical_tag, canonical_url = match.group(1), match.group(2)
    insertion = (
        f'{canonical_tag}{newline}'
        f'    <link rel="alternate" hreflang="ru-RU" href="{canonical_url}">{newline}'
        f'    <link rel="alternate" hreflang="x-default" href="{canonical_url}">'
    )
    text = text.replace(canonical_tag, insertion, 1)

    if text != original:
        with path.open('w', encoding='utf-8', newline='') as fp:
            fp.write(text)
        return True
    return False


def main() -> None:
    changed = 0
    for page in iter_pages():
        if sync_file(page):
            changed += 1
    print(f'Updated hreflang on {changed} pages.')


if __name__ == '__main__':
    main()
