from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://eleonorlab.com/"

ATTR_RE = re.compile(
    r'(?P<attr>\b(?:href|src|action|data-bg|poster)\s*=\s*)(?P<q>["\"])(?P<val>.*?)(?P=q)',
    re.IGNORECASE,
)
SRCSET_RE = re.compile(r'(?P<attr>\bsrcset\s*=\s*)(?P<q>["\"])(?P<val>.*?)(?P=q)', re.IGNORECASE)
URL_FUNC_RE = re.compile(r'url\((?P<q>[\"\']?)(?P<val>[^)\"\']+)(?P=q)\)', re.IGNORECASE)


def list_root_pages() -> list[Path]:
    return sorted(
        p for p in ROOT.glob('*.html')
        if not p.name.startswith('__')
    )


def route_for_page(name: str) -> str:
    if name == 'index.html':
        return ''
    return f"{Path(name).stem}/"


def target_for_context(name: str, nested: bool) -> str:
    if name == 'index.html':
        return '../' if nested else './'
    slug = Path(name).stem
    return f"../{slug}/" if nested else f"{slug}/"


def split_suffix(value: str) -> tuple[str, str]:
    match = re.match(r'([^?#]*)(.*)$', value)
    if not match:
        return value, ''
    return match.group(1), match.group(2)


def replace_absolute_page_urls(text: str, page_names: list[str]) -> str:
    updated = text
    for page in page_names:
        old = f"{BASE_URL}{page}"
        new = f"{BASE_URL}{route_for_page(page)}"
        updated = updated.replace(old, new)
    return updated


def convert_value(value: str, page_set: set[str], nested: bool) -> str:
    lower = value.lower()
    if lower.startswith(('http://', 'https://', 'mailto:', 'tel:', 'javascript:', 'data:')):
        return value
    if value.startswith('#'):
        return value

    base, suffix = split_suffix(value)
    if not base:
        return value

    original_base = base
    normalized = base

    if normalized.startswith('./'):
        normalized = normalized[2:]
    elif normalized.startswith('../'):
        # Already relative from nested context; leave as-is.
        return value

    # Handle root-prefixed links like /EleonorLab/about.html
    if normalized.startswith('/'):
        trimmed = normalized.lstrip('/')
        if trimmed.lower().startswith('eleonorlab/'):
            normalized = trimmed.split('/', 1)[1]
        else:
            # Absolute from domain root: do not mutate except known html pages
            candidate = Path(trimmed).name
            if candidate in page_set:
                return f"/{route_for_page(candidate)}{suffix}"
            return value

    candidate = Path(normalized).name
    if candidate in page_set:
        return f"{target_for_context(candidate, nested)}{suffix}"

    if nested:
        for prefix in ('assets/', 'css/', 'js/', 'font/', 'scripts/'):
            if normalized.startswith(prefix):
                return f"../{normalized}{suffix}"

        if original_base.startswith('./'):
            cleaned = original_base[2:]
            for prefix in ('assets/', 'css/', 'js/', 'font/', 'scripts/'):
                if cleaned.startswith(prefix):
                    return f"../{cleaned}{suffix}"

    return value


def rewrite_attributes(text: str, page_set: set[str], nested: bool) -> str:
    def repl(match: re.Match[str]) -> str:
        attr = match.group('attr')
        quote = match.group('q')
        val = match.group('val')
        new_val = convert_value(val, page_set, nested)
        return f"{attr}{quote}{new_val}{quote}"

    return ATTR_RE.sub(repl, text)


def rewrite_srcset(text: str, page_set: set[str], nested: bool) -> str:
    def repl(match: re.Match[str]) -> str:
        attr = match.group('attr')
        quote = match.group('q')
        val = match.group('val')
        parts = [p.strip() for p in val.split(',')]
        updated_parts: list[str] = []
        for part in parts:
            if not part:
                continue
            tokens = part.split()
            if not tokens:
                continue
            url = tokens[0]
            rest = ' '.join(tokens[1:])
            new_url = convert_value(url, page_set, nested)
            updated_parts.append(f"{new_url} {rest}".strip())
        return f"{attr}{quote}{', '.join(updated_parts)}{quote}"

    return SRCSET_RE.sub(repl, text)


def rewrite_url_functions(text: str, page_set: set[str], nested: bool) -> str:
    def repl(match: re.Match[str]) -> str:
        quote = match.group('q')
        val = match.group('val')
        new_val = convert_value(val, page_set, nested)
        return f"url({quote}{new_val}{quote})"

    return URL_FUNC_RE.sub(repl, text)


def build_redirect_page(target: str, canonical: str) -> str:
    return f'''<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecting...</title>
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="{canonical}">
  <meta http-equiv="refresh" content="0; url={target}">
  <script>
    (function () {{
      var target = '{target}';
      var search = window.location.search || '';
      var hash = window.location.hash || '';
      window.location.replace(target + search + hash);
    }})();
  </script>
</head>
<body>
  <p>Redirecting to <a href="{target}">{target}</a>...</p>
</body>
</html>
'''


def main() -> None:
    pages = list_root_pages()
    page_names = [p.name for p in pages]
    page_set = set(page_names)

    # 1) Build real folder pages from all non-home root html files.
    for page in pages:
        if page.name == 'index.html':
            continue

        original = page.read_text(encoding='utf-8')
        transformed = replace_absolute_page_urls(original, page_names)
        transformed = rewrite_attributes(transformed, page_set, nested=True)
        transformed = rewrite_srcset(transformed, page_set, nested=True)
        transformed = rewrite_url_functions(transformed, page_set, nested=True)

        folder = ROOT / page.stem
        folder.mkdir(exist_ok=True)
        (folder / 'index.html').write_text(transformed, encoding='utf-8', newline='\n')

    # 2) Update root index links to folder routes.
    root_index = ROOT / 'index.html'
    if root_index.exists():
        idx = root_index.read_text(encoding='utf-8')
        idx = replace_absolute_page_urls(idx, page_names)
        idx = rewrite_attributes(idx, page_set, nested=False)
        idx = rewrite_srcset(idx, page_set, nested=False)
        idx = rewrite_url_functions(idx, page_set, nested=False)
        root_index.write_text(idx, encoding='utf-8', newline='\n')

    # 3) Replace old root pages with redirects to folder routes.
    for page in pages:
        if page.name == 'index.html':
            continue

        target = f"./{page.stem}/"
        canonical = f"{BASE_URL}{page.stem}/"
        redirect_html = build_redirect_page(target=target, canonical=canonical)
        page.write_text(redirect_html, encoding='utf-8', newline='\n')

    print(f"Migrated {len(page_names) - 1} pages to folder routes and created legacy redirects.")


if __name__ == '__main__':
    main()
