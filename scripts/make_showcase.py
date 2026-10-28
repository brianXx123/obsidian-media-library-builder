#!/usr/bin/env python3
"""Generate lightweight GitHub previews from verified, unmodified Obsidian captures.

Never edits original screenshots. The short GIFs are labeled as *screenshot
slideshows*, not genuine interaction recordings.
Requires Pillow 11+ as a development-only dependency.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "screenshots"
DEST = SOURCE / "previews"
DESKTOP = ("desktop-library.png", "desktop-movies.png",
           "desktop-series.png", "desktop-detail.png", "desktop-filter.png",
           "desktop-note.png", "desktop-light.png")
MOBILE = ("mobile-library.png", "mobile-detail.png", "mobile-filter.png")

def rgba_preview(path: Path, max_width: int, max_height: int) -> Image.Image:
    with Image.open(path) as opened:
        opened.load()
        copy = ImageOps.exif_transpose(opened).convert("RGB")
    copy.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    return copy

def assert_sources_verified():
    evidence = json.loads((SOURCE / "metadata.json").read_text(encoding="utf-8"))
    indexed = {row["file"]: row for row in evidence}
    for filename in DESKTOP + MOBILE:
        original = SOURCE / filename
        if filename not in indexed or not original.is_file():
            raise ValueError("Missing original or metadata: " + filename)
        observed = hashlib.sha256(original.read_bytes()).hexdigest()
        expected = indexed[filename]["sha256"]
        if observed != expected:
            raise ValueError("Refusing to make preview from unverified screenshot: " + filename)
    return indexed

def make_webp(filename, maxw, maxh):
    picture = rgba_preview(SOURCE / filename, maxw, maxh)
    dest = DEST / (Path(filename).stem + ".webp")
    picture.save(dest, "WEBP", quality=77, method=6)
    return dest

def make_slideshow(filenames, name, maxw, maxh):
    # This is a panorama-free slideshow of *real* screenshots, no fake motions.
    frames = []
    for filename in filenames:
        im = rgba_preview(SOURCE / filename, maxw, maxh)
        canvas = Image.new("RGB", (maxw, maxh), (22, 23, 29))
        canvas.paste(im, ((maxw - im.width)//2, (maxh - im.height)//2))
        frames.append(canvas.quantize(colors=96, method=Image.Quantize.FASTOCTREE))
    output = DEST / name
    frames[0].save(output, save_all=True, append_images=frames[1:],
                   duration=[1600]*len(frames), loop=0, optimize=True,
                   disposal=2)
    return output

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check-only", action="store_true",
                        help="Only validate the original PNG checksums")
    args = parser.parse_args()
    assert_sources_verified()
    if args.check_only:
        print("PASS: 10/10 source screenshot hashes match metadata")
        return
    DEST.mkdir(parents=True, exist_ok=True)
    outputs = []
    for name in DESKTOP:
        outputs.append(make_webp(name, 960, 540))
    for name in MOBILE:
        outputs.append(make_webp(name, 400, 900))
    outputs.append(make_slideshow(
        ("desktop-library.png", "desktop-detail.png", "desktop-filter.png"),
        "desktop-screenshot-tour.gif", 800, 450))
    outputs.append(make_slideshow(
        ("mobile-library.png", "mobile-detail.png", "mobile-filter.png"),
        "mobile-screenshot-tour.gif", 360, 800))
    record = [
        "# Screenshot preview derivatives / 截图预览衍生文件",
        "",
        "Generated from the **actual captured PNG files** in the parent directory.",
        "Source images remain unchanged. Their SHA-256 is checked against",
        "`docs/screenshots/metadata.json` before building any preview.",
        "",
        "WebP files are **resized, lossy previews** suitable for README display.",
        "GIF files are **slideshows of real still screenshots, not recordings of",
        "interactions or actual animation**. Do not claim otherwise.",
        "",
        "桌面 0.3.1、移动端 0.3.0 原始截图和证据见上层目录；压缩版只用于网页展示，",
        "GIF 只是已验收静态截图的轮播，不是实际操作录屏，原图没有被修改。",
        "",
        "Regenerate: `python scripts/make_showcase.py` (Pillow 11+).",
        "",
        "### Generated previews / 生成文件",
        ""
    ]
    for p in outputs:
        record.append(f"- `{p.name}` — {p.stat().st_size:,} bytes")
    (DEST / "README.md").write_text("\n".join(record)+"\n",encoding="utf-8")
    print("PASS: source checksums; generated",len(outputs),"preview images")
    for p in outputs:
        print(p.name,p.stat().st_size)

if __name__ == "__main__":
    main()
