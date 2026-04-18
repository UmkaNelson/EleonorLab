#!/usr/bin/env python3
"""Generate sitemap.xml from canonical pages and sync robots.txt."""

from __future__ import annotations

import argparse
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


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
    r'<link\s+rel="canonical"\s+href="([^"]+)"\s*/?>',
    re.IGNORECASE,
)


def iter_pages() -> list[Path]:
    pages: list[Path] = []

    root_index = ROOT / 'index.html'
    if root_index.exists():
        pages.append(root_index)

    nested = sorted(ROOT.glob('*/index.html'), key=lambda p: p.parent.name)
    for page in nested:
        parent = page.parent.name
        if parent in EXCLUDED_DIRS or parent.startswith('.') or parent.startswith('__'):
            continue
        pages.append(page)

    return pages


def virtual_name(page: Path) -> str:
    if page.parent == ROOT and page.name == 'index.html':
        return 'index.html'
    if page.name == 'index.html':
        return f'{page.parent.name}.html'
    return page.name


def resolve_loc(page: Path, base_url: str) -> str:
    text = page.read_text(encoding='utf-8')
    match = CANONICAL_RE.search(text)
    if match:
        href = match.group(1).strip()
        if href.startswith(('http://', 'https://')):
            return href

    if page.parent == ROOT and page.name == 'index.html':
        return f'{base_url}/'
    return f'{base_url}/{page.parent.name}/'


def page_priority(name: str) -> str:
    if name == 'index.html':
        return '1.0'
    if name == 'projects.html':
        return '0.95'
    if name in {'about.html', 'contacts.html', 'stages.html', 'str.html'}:
        return '0.85'
    if name.startswith('project-kp'):
        return '0.90'
    if name.startswith('project-sp'):
        return '0.88'
    return '0.80'


def page_changefreq(name: str) -> str:
    if name in {'index.html', 'projects.html'}:
        return 'weekly'
    if name.startswith('project-'):
        return 'monthly'
    return 'monthly'


def page_lastmod(page: Path) -> str:
    ts = page.stat().st_mtime
    dt = datetime.fromtimestamp(ts, tz=timezone.utc).date()
    return dt.isoformat()


def order_key(name: str) -> tuple[int, str]:
    if name == 'index.html':
        return (0, name)
    if name == 'projects.html':
        return (1, name)
    if name in {'about.html', 'contacts.html', 'stages.html', 'str.html'}:
        return (2, name)
    if name.startswith('project-kp'):
        suffix = name.removeprefix('project-kp').removesuffix('.html')
        try:
            return (3, f'{int(suffix):04d}')
        except ValueError:
            return (3, suffix)
    if name.startswith('project-sp'):
        return (4, name)
    return (5, name)


def build_sitemap(base_url: str) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    pages = sorted(iter_pages(), key=lambda p: order_key(virtual_name(p)))
    for page in pages:
        name = virtual_name(page)
        lines.extend(
            [
                '  <url>',
                f'    <loc>{resolve_loc(page, base_url)}</loc>',
                f'    <lastmod>{page_lastmod(page)}</lastmod>',
                f'    <changefreq>{page_changefreq(name)}</changefreq>',
                f'    <priority>{page_priority(name)}</priority>',
                '  </url>',
            ]
        )
    lines.append('</urlset>')
    return '\n'.join(lines) + '\n'


def build_robots(base_url: str) -> str:
    return (
        'User-agent: *\n'
        'Allow: /\n'
        '\n'
        f'Sitemap: {base_url}/sitemap.xml\n'
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Generate sitemap.xml and optionally robots.txt.'
    )
    parser.add_argument(
        '--base-url',
        default='https://eleonorlab.com',
        help='Public site base URL without trailing slash.',
    )
    parser.add_argument(
        '--skip-robots',
        action='store_true',
        help='Do not overwrite robots.txt.',
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip('/')

    sitemap_path = ROOT / 'sitemap.xml'
    sitemap_path.write_text(build_sitemap(base_url), encoding='utf-8', newline='\n')

    if not args.skip_robots:
        robots_path = ROOT / 'robots.txt'
        robots_path.write_text(build_robots(base_url), encoding='utf-8', newline='\n')

    print(f'Generated {sitemap_path.name} for {base_url}')
    if not args.skip_robots:
        print('Synced robots.txt')


if __name__ == '__main__':
    main()
