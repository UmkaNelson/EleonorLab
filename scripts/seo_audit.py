#!/usr/bin/env python3
"""Technical SEO audit for canonical HTML pages."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List


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


@dataclass
class PageResult:
    name: str
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    title: str = ''
    description: str = ''


def extract(pattern: str, text: str, flags: int = re.IGNORECASE) -> str | None:
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else None


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


def page_label(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def audit_page(path: Path) -> PageResult:
    text = path.read_text(encoding='utf-8')
    result = PageResult(name=page_label(path))

    title = extract(r'<title>(.*?)</title>', text, re.IGNORECASE | re.DOTALL)
    desc = extract(r'<meta\s+name="description"\s+content="([^"]*)"', text)
    robots = extract(r'<meta\s+name="robots"\s+content="([^"]*)"', text)
    canonical = extract(r'<link\s+rel="canonical"\s+href="([^"]+)"', text)
    hreflang_ru = extract(
        r'<link\s+rel="alternate"\s+hreflang="ru-RU"\s+href="([^"]+)"', text
    )
    hreflang_default = extract(
        r'<link\s+rel="alternate"\s+hreflang="x-default"\s+href="([^"]+)"', text
    )
    og_title = extract(r'<meta\s+property="og:title"\s+content="([^"]*)"', text)
    og_desc = extract(r'<meta\s+property="og:description"\s+content="([^"]*)"', text)
    og_image = extract(r'<meta\s+property="og:image"\s+content="([^"]*)"', text)
    tw_title = extract(r'<meta\s+name="twitter:title"\s+content="([^"]*)"', text)
    tw_desc = extract(r'<meta\s+name="twitter:description"\s+content="([^"]*)"', text)
    tw_image = extract(r'<meta\s+name="twitter:image"\s+content="([^"]*)"', text)

    result.title = title or ''
    result.description = desc or ''

    if not title:
        result.errors.append('Missing <title>')
    if not desc:
        result.errors.append('Missing meta description')
    if not robots:
        result.errors.append('Missing robots meta')
    if not canonical:
        result.errors.append('Missing canonical link')
    if not hreflang_ru:
        result.errors.append('Missing hreflang ru-RU')
    if not hreflang_default:
        result.errors.append('Missing hreflang x-default')
    if not og_title or not og_desc or not og_image:
        result.errors.append('Missing OG meta (title/description/image)')
    if not tw_title or not tw_desc or not tw_image:
        result.errors.append('Missing Twitter meta (title/description/image)')

    h1_count = len(re.findall(r'<h1[\s>]', text, flags=re.IGNORECASE))
    if h1_count != 1:
        result.errors.append(f'Expected 1 H1, found {h1_count}')

    if robots and not all(
        token in robots.lower()
        for token in ['index', 'follow', 'max-image-preview:large']
    ):
        result.warnings.append('Robots meta does not match expected policy')

    if canonical and not canonical.startswith(('https://', 'http://')):
        result.errors.append('Canonical is not absolute URL')

    if canonical and hreflang_ru and canonical != hreflang_ru:
        result.warnings.append('hreflang ru-RU differs from canonical')
    if canonical and hreflang_default and canonical != hreflang_default:
        result.warnings.append('hreflang x-default differs from canonical')

    if title and not (15 <= len(title) <= 70):
        result.warnings.append(f'Title length {len(title)} outside 15-70')
    if desc and not (70 <= len(desc) <= 180):
        result.warnings.append(f'Description length {len(desc)} outside 70-180')

    blocks = re.findall(
        r'<script\s+type="application/ld\+json">\s*(.*?)\s*</script>',
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not blocks:
        result.errors.append('Missing JSON-LD')
    else:
        for i, block in enumerate(blocks, start=1):
            try:
                json.loads(block)
            except Exception as exc:  # noqa: BLE001
                result.errors.append(f'Invalid JSON-LD block {i}: {exc}')

    return result


def check_internal_links(files: List[Path]) -> Dict[str, List[str]]:
    broken: Dict[str, List[str]] = {}
    for page in files:
        text = page.read_text(encoding='utf-8')
        page_broken: List[str] = []
        for attr in ('href', 'src'):
            for m in re.finditer(fr'{attr}="([^"]+)"', text):
                link = m.group(1)
                if link.startswith(
                    ('http://', 'https://', 'mailto:', 'tel:', '#', 'javascript:', 'data:')
                ):
                    continue
                clean = link.split('?')[0].split('#')[0]
                if not clean:
                    continue
                target = (page.parent / clean).resolve()
                if not target.exists():
                    page_broken.append(f'{attr}={link}')
        if page_broken:
            broken[page_label(page)] = page_broken
    return broken


def main() -> None:
    files = iter_pages()
    results = [audit_page(p) for p in files]

    title_map: Dict[str, List[str]] = {}
    desc_map: Dict[str, List[str]] = {}
    for r in results:
        title_map.setdefault(r.title, []).append(r.name)
        desc_map.setdefault(r.description, []).append(r.name)

    duplicate_titles = {k: v for k, v in title_map.items() if k and len(v) > 1}
    duplicate_desc = {k: v for k, v in desc_map.items() if k and len(v) > 1}
    broken = check_internal_links(files)

    total_errors = sum(len(r.errors) for r in results)
    total_warnings = sum(len(r.warnings) for r in results)

    print(f'Pages audited: {len(results)}')
    print(f'Total errors: {total_errors}')
    print(f'Total warnings: {total_warnings}')

    if duplicate_titles:
        print('\nDuplicate titles:')
        for title, pages in duplicate_titles.items():
            print(f'- {title!r}: {", ".join(pages)}')

    if duplicate_desc:
        print('\nDuplicate descriptions:')
        for desc, pages in duplicate_desc.items():
            print(f'- {desc[:90]!r}...: {", ".join(pages)}')

    if broken:
        print('\nBroken internal links:')
        for page, links in broken.items():
            print(f'- {page}: {", ".join(links)}')

    for r in results:
        if r.errors or r.warnings:
            print(f'\n[{r.name}]')
            for err in r.errors:
                print(f'  ERROR: {err}')
            for warn in r.warnings:
                print(f'  WARN: {warn}')

    if total_errors > 0:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
