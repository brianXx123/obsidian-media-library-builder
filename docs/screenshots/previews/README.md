# Screenshot preview derivatives / 截图预览衍生文件

Generated from the **actual captured PNG files** in the parent directory.
Source images remain unchanged. Their SHA-256 is checked against
`docs/screenshots/metadata.json` before building any preview.

WebP files are **resized, lossy previews** suitable for README display.
GIF files are **slideshows of real still screenshots, not recordings of
interactions or actual animation**. Do not claim otherwise.

桌面 0.3.1、移动端 0.3.0 原始截图和证据见上层目录；压缩版只用于网页展示，
GIF 只是已验收静态截图的轮播，不是实际操作录屏，原图没有被修改。

Regenerate: `python scripts/make_showcase.py` (Pillow 11+).

### Generated previews / 生成文件

- `desktop-library.webp` — 84,052 bytes
- `desktop-movies.webp` — 82,032 bytes
- `desktop-series.webp` — 9,352 bytes
- `desktop-detail.webp` — 37,842 bytes
- `desktop-filter.webp` — 7,524 bytes
- `desktop-note.webp` — 10,646 bytes
- `desktop-light.webp` — 84,612 bytes
- `mobile-library.webp` — 41,890 bytes
- `mobile-detail.webp` — 29,750 bytes
- `mobile-filter.webp` — 19,848 bytes
- `desktop-screenshot-tour.gif` — 193,708 bytes
- `mobile-screenshot-tour.gif` — 171,900 bytes
