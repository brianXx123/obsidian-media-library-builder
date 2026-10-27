# Media Library Wall (Obsidian plugin) / Obsidian 海报墙插件

A standalone **native Obsidian View** for the catalog created by the Media Library Builder CLI. This is an independently implemented **compatibility wall**, **not** an import of the author's unavailable original Movie Wall plugin.

这是针对本项目 catalog 格式独立实现的 Obsidian 内置海报墙界面，并非用户原版 Movie Wall 源码移植。

## Install / 安装

1. Create a vault via the CLI: `python scripts/media_library.py import --vault "/path/to/vault" --input examples/sample.csv`.
2. Close Obsidian (recommended). Copy **the three files** `manifest.json`, `main.js` and `styles.css` from this folder to `<vault>/.obsidian/plugins/media-library-wall/`.
3. Open Obsidian → Settings → Community plugins → enable third-party plugins (if desired) → enable **Media Library Wall**.
4. Use the film ribbon icon or Command Palette: **Open Media Library / 打开影音库**.

支持桌面与 Obsidian Mobile 布局，但尚未进行 Obsidian 真机端到端验收。

## Implemented / 已实现
- Search by Chinese/original titles; filter movie/TV, genre, watched; sort by title, rating, year.
- Poster thumbnails from **vault-local** files only; safe placeholder if missing.
- Native Obsidian detail modal, metadata, overview, and open Markdown note.
- Watched status persists as `Media Library/user-state.json` independent of regenerated catalog.
- No remote network connections, telemetry, TMDB calls, or downloaded posters.

## Safety / 安全
Back up an existing vault before installing. The plugin requires a `schema_version: 1` catalog. User notes are never overwritten by this plugin. The watched override file is user-owned and should be retained across imports. Obsidian's `Community plugins` setting is a user security decision; installation does not silently activate plugins.

## Known limits / 已知限制
No original Movie Wall design parity, no collection editing, no automatic metadata scraping, no full real-device Obsidian verification. UI screenshot mockups made by image models should not be presented as evidence of this implementation.
