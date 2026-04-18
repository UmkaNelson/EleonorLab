#!/usr/bin/env python3
"""Convert referenced raster images to WebP and update project references."""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
BASE_URL = 'https://eleonorlab.com'
EXCLUDED_IMAGE_NAMES = {'logo-main.png'}
EXCLUDED_DIRS = {
    '.git',
    'assets',
    'css',
    'js',
    'font',
    'scripts',
    '__pycache__',
}

IMAGE_REF_RE = re.compile(
    r'assets/image/[A-Za-z0-9_\-./]+\.(?:png|jpg|jpeg)',
    re.IGNORECASE,
)
ICON_IMG_RE = re.compile(
    r'<img(?P<attrs>[^>]*\bsrc="(?:\./)?assets/icons/[123]\.png"[^>]*)>',
    re.IGNORECASE,
)


def iter_html_files() -> list[Path]:
    files: list[Path] = []
    files.extend(sorted(p for p in ROOT.glob('*.html') if not p.name.startswith('__')))
    for page in sorted(ROOT.glob('*/index.html'), key=lambda p: p.parent.name):
        parent = page.parent.name
        if parent in EXCLUDED_DIRS or parent.startswith('.') or parent.startswith('__'):
            continue
        files.append(page)
    return files


def iter_text_files() -> list[Path]:
    files: list[Path] = []
    files.extend(iter_html_files())
    files.extend(sorted((ROOT / 'css').glob('*.css')))
    files.extend(sorted((ROOT / 'js').glob('*.js')))
    return files


def collect_referenced_images(files: list[Path]) -> set[str]:
    refs: set[str] = set()
    for file in files:
        text = file.read_text(encoding='utf-8')
        for match in IMAGE_REF_RE.finditer(text):
            ref = match.group(0)
            if ref.startswith('./'):
                ref = ref[2:]
            if Path(ref).name in EXCLUDED_IMAGE_NAMES:
                continue
            if (ROOT / ref).exists():
                refs.add(ref)
    return refs


def convert_to_webp(refs: set[str]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for ref in sorted(refs):
        source = ROOT / ref
        target = source.with_suffix('.webp')
        target_rel = target.relative_to(ROOT).as_posix()

        if not target.exists():
            with Image.open(source) as img:
                img.load()
                has_alpha = 'A' in img.getbands()
                if has_alpha and img.mode != 'RGBA':
                    img = img.convert('RGBA')
                elif not has_alpha and img.mode != 'RGB':
                    img = img.convert('RGB')
                img.save(target, 'WEBP', quality=82, method=6)

        mapping[ref] = target_rel

    return mapping


def replace_references(files: list[Path], mapping: dict[str, str]) -> int:
    changed = 0
    for file in files:
        text = file.read_text(encoding='utf-8')
        original = text

        for old, new in mapping.items():
            text = text.replace(f'./{old}', f'./{new}')
            text = text.replace(old, new)
            text = text.replace(f'{BASE_URL}/{old}', f'{BASE_URL}/{new}')

        if text != original:
            file.write_text(text, encoding='utf-8', newline='\n')
            changed += 1

    return changed


def add_icon_dimensions() -> int:
    changed = 0
    for html_file in iter_html_files():
        text = html_file.read_text(encoding='utf-8')
        original = text

        def repl(match: re.Match[str]) -> str:
            attrs = match.group('attrs')
            updated_attrs = attrs
            if re.search(r'\bwidth\s*=', updated_attrs, re.IGNORECASE) is None:
                updated_attrs += ' width="16"'
            if re.search(r'\bheight\s*=', updated_attrs, re.IGNORECASE) is None:
                updated_attrs += ' height="16"'
            return f'<img{updated_attrs}>'

        text = ICON_IMG_RE.sub(repl, text)

        if text != original:
            html_file.write_text(text, encoding='utf-8', newline='\n')
            changed += 1

    return changed


def main() -> None:
    files = iter_text_files()
    refs = collect_referenced_images(files)
    mapping = convert_to_webp(refs)
    changed_files = replace_references(files, mapping)
    icon_changed = add_icon_dimensions()

    print(f'Referenced sources converted/mapped: {len(mapping)}')
    print(f'Text files updated: {changed_files}')
    print(f'HTML files with icon dimensions updated: {icon_changed}')


if __name__ == '__main__':
    main()
