from __future__ import annotations

import re
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets" / "image"
EXCLUDED_DIRS = {
    ".git",
    "assets",
    "css",
    "js",
    "font",
    "scripts",
    "__pycache__",
}
VARIANT_WIDTHS = (480, 960, 1440)
QUALITY = 82
DYNAMIC_IMAGE_REFS = (
    "assets/image/about/10.webp",
    "assets/image/about/11.webp",
    "assets/image/about/12.webp",
    "assets/image/about/13.webp",
)

IMG_TAG_RE = re.compile(
    r"<img\b[^>]*\bsrc=\"(?P<src>(?:\./)?assets/image/[^\"]+)\"[^>]*>",
    re.IGNORECASE | re.DOTALL,
)
SRC_ATTR_RE = re.compile(r'\bsrc="[^"]+"')
SRCSET_ATTR_RE = re.compile(r'\s+srcset="[^"]*"')
SIZES_ATTR_RE = re.compile(r'\s+sizes="[^"]*"')
WIDTH_ATTR_RE = re.compile(r'\bwidth="(?P<width>\d+)"')
HEIGHT_ATTR_RE = re.compile(r'\bheight="(?P<height>\d+)"')


def iter_html_files() -> list[Path]:
    files: list[Path] = []
    files.extend(sorted(p for p in ROOT.glob("*.html") if not p.name.startswith("__")))
    for page in sorted(ROOT.glob("*/index.html"), key=lambda p: p.parent.name):
        parent = page.parent.name
        if parent in EXCLUDED_DIRS or parent.startswith(".") or parent.startswith("__"):
            continue
        files.append(page)
    return files


HTML_FILES = iter_html_files()


def normalize_ref(ref: str) -> str:
    if ref.startswith("./"):
        return ref[2:]
    return ref


def collect_referenced_sources() -> set[Path]:
    sources: set[Path] = set()

    for html_file in HTML_FILES:
        content = html_file.read_text(encoding="utf-8")
        for match in IMG_TAG_RE.finditer(content):
            src_ref = match.group("src")
            normalized = normalize_ref(src_ref)
            source_path = ROOT / normalized
            if source_path.exists() and source_path.name != "logo-main.png":
                sources.add(source_path)

    for ref in DYNAMIC_IMAGE_REFS:
        source_path = ROOT / ref
        if source_path.exists():
            sources.add(source_path)

    return sources


def ensure_variants() -> None:
    for source in collect_referenced_sources():
        if source.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue

        with Image.open(source) as image:
            image.load()
            width, height = image.size
            has_alpha = "A" in image.getbands()

            for target_width in VARIANT_WIDTHS:
                if width <= target_width:
                    continue

                target_height = round(height * target_width / width)
                variant = source.with_name(f"{source.stem}-{target_width}w.webp")
                resized = image.resize((target_width, target_height), Image.Resampling.LANCZOS)

                if has_alpha and resized.mode != "RGBA":
                    resized = resized.convert("RGBA")
                elif not has_alpha and resized.mode != "RGB":
                    resized = resized.convert("RGB")

                resized.save(variant, "WEBP", quality=QUALITY, method=6)


def choose_sizes(context: str, intrinsic_width: int) -> str:
    rules = (
        ("about-quick-project-card__media", "(max-width: 768px) 100vw, (max-width: 1280px) 46vw, 590px"),
        ("about-story__pride-gallery-item", "(max-width: 768px) 100vw, (max-width: 1280px) 31vw, 380px"),
        ("about-story__upcoming-media", "(max-width: 768px) 100vw, (max-width: 1280px) 31vw, 380px"),
        ("project-entry__duo-item", "(max-width: 768px) 100vw, (max-width: 1280px) 46vw, 590px"),
        ("project-entry__gallery-item--pair", "(max-width: 768px) 100vw, (max-width: 1280px) 46vw, 590px"),
        ("project-entry__hero", "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"),
        ("project-entry__gallery-item", "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"),
        ("about-story__pride-media", "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1280px"),
        ("about-story__office-media", "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1280px"),
        ("stages-page__slide", "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"),
        ("str-media", "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"),
        ("tour-project__hero", "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"),
        ("tour-project__trip-item", "(max-width: 768px) 100vw, (max-width: 1280px) 30vw, 360px"),
        ("tour-project__wide", "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"),
    )

    for marker, sizes in rules:
        if marker in context:
            return sizes

    if intrinsic_width >= 1200:
        return "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"
    if intrinsic_width >= 960:
        return "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 960px"
    if intrinsic_width >= 640:
        return "(max-width: 768px) 100vw, 640px"
    return f"{intrinsic_width}px"


def build_srcset(src_ref: str, intrinsic_width: int) -> str | None:
    normalized = normalize_ref(src_ref)
    prefix = "./" if src_ref.startswith("./") else ""
    source_path = ROOT / normalized
    base_ref = f"{Path(normalized).with_suffix('').as_posix()}"
    candidates: list[str] = []

    for target_width in VARIANT_WIDTHS:
        variant_path = ROOT / f"{base_ref}-{target_width}w.webp"
        if variant_path.exists():
            candidates.append(f"{prefix}{base_ref}-{target_width}w.webp {target_width}w")

    if not candidates:
        return None

    candidates.append(f"{src_ref} {intrinsic_width}w")
    return ", ".join(candidates)


def update_img_tags() -> None:
    for html_file in HTML_FILES:
        content = html_file.read_text(encoding="utf-8")

        def replace(match: re.Match[str]) -> str:
            tag = match.group(0)
            src_match = SRC_ATTR_RE.search(tag)
            if not src_match:
                return tag

            src_ref = src_match.group(0)[5:-1]
            if src_ref.endswith("logo-main.png"):
                return tag

            source_path = ROOT / normalize_ref(src_ref)
            if not source_path.exists():
                return tag

            with Image.open(source_path) as image:
                intrinsic_width, intrinsic_height = image.size

            context_start = max(0, match.start() - 300)
            context_end = min(len(content), match.end() + 120)
            context = content[context_start:context_end]

            srcset = build_srcset(src_ref, intrinsic_width)
            if not srcset:
                return tag

            sizes = choose_sizes(context, intrinsic_width)
            updated = SRCSET_ATTR_RE.sub("", tag)
            updated = SIZES_ATTR_RE.sub("", updated)

            if not WIDTH_ATTR_RE.search(updated):
                updated = updated.replace(
                    src_match.group(0),
                    f'width="{intrinsic_width}" height="{intrinsic_height}" {src_match.group(0)}',
                    1,
                )
            elif not HEIGHT_ATTR_RE.search(updated):
                updated = WIDTH_ATTR_RE.sub(
                    lambda width_match: f'{width_match.group(0)} height="{intrinsic_height}"',
                    updated,
                    count=1,
                )

            updated = SRC_ATTR_RE.sub(
                lambda src_attr: f'{src_attr.group(0)} srcset="{srcset}" sizes="{sizes}"',
                updated,
                count=1,
            )
            return updated

        updated_content = IMG_TAG_RE.sub(replace, content)
        if updated_content != content:
            html_file.write_text(updated_content, encoding="utf-8")


def main() -> None:
    ensure_variants()
    update_img_tags()
    print("Responsive image variants and srcset/sizes applied.")


if __name__ == "__main__":
    main()
