#!/usr/bin/env python3
"""Convert RollSet UI artwork to WebP and update source references safely."""

from pathlib import Path
import re
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIRS = [
    ROOT / "Assets" / "Backs",
    ROOT / "Assets" / "Faces",
    ROOT / "Assets" / "Intro",
    ROOT / "Assets" / "Logo",
]
TEXT_EXTENSIONS = {".html", ".js", ".css", ".json", ".md", ".xml", ".webmanifest"}
REFERENCE_RE = re.compile(r"""(?P<path>Assets/(?:Backs|Faces|Intro|Logo)/[^"'\s)<]+)\.png""")

def format_size(size):
    return f"{size / (1024 * 1024):.2f} MiB"

def convert_png(source: Path) -> Path:
    target = source.with_suffix(".webp")
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        image.load()
        image.save(target, "WEBP", quality=90, method=6)
    return target

def optimize_favicon(path: Path) -> None:
    # Keep PNG for broad browser compatibility, but resize the source to an icon-sized image.
    with Image.open(path) as original:
        image = ImageOps.exif_transpose(original).convert("RGBA")
        image.thumbnail((64, 64), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        canvas.alpha_composite(image, ((64 - image.width) // 2, (64 - image.height) // 2))
        canvas.save(path, "PNG", optimize=True)

def update_references():
    changed = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        if ".git" in path.parts or path.name == Path(__file__).name:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        def replace(match):
            asset_path = match.group("path")
            if asset_path.endswith("/favicon"):
                return match.group(0)
            return asset_path + ".webp"

        updated = REFERENCE_RE.sub(replace, text)
        if updated != text:
            path.write_text(updated, encoding="utf-8", newline="")
            changed.append(path.relative_to(ROOT).as_posix())
    return changed

def main():
    pngs = []
    for folder in ASSET_DIRS:
        if folder.exists():
            pngs.extend(p for p in folder.rglob("*.png") if p.name.lower() != "favicon.png")

    if not pngs:
        print("No source artwork PNGs found. Nothing to convert.")
        return

    before = sum(p.stat().st_size for p in pngs)
    converted = []
    for source in pngs:
        target = convert_png(source)
        converted.append((source, target))
        print(f"{source.relative_to(ROOT)} -> {target.relative_to(ROOT)}: "
              f"{format_size(source.stat().st_size)} -> {format_size(target.stat().st_size)}")

    changed_refs = update_references()

    # Delete originals only after every conversion and reference update succeeded.
    for source, _ in converted:
        source.unlink()

    favicon = ROOT / "Assets" / "Logo" / "favicon.png"
    favicon_before = favicon.stat().st_size if favicon.exists() else 0
    if favicon.exists():
        optimize_favicon(favicon)

    artwork_after = sum(target.stat().st_size for _, target in converted)
    after = artwork_after + (favicon.stat().st_size if favicon.exists() else 0)
    original_total = before + favicon_before
    saved = original_total - after
    percent = (saved / original_total * 100) if original_total else 0

    print("\nOptimization summary")
    print(f"Converted artwork files: {len(converted)}")
    print(f"Updated source files: {len(changed_refs)}")
    for path in changed_refs:
        print(f"  updated: {path}")
    print(f"Source artwork: {format_size(before)}")
    print(f"Artwork WebP output: {format_size(artwork_after)}")
    if favicon.exists():
        print(f"Favicon PNG: {format_size(favicon_before)} -> {format_size(favicon.stat().st_size)}")
    print(f"Estimated total reduction for processed assets: {format_size(saved)} ({percent:.1f}%)")

if __name__ == "__main__":
    main()
