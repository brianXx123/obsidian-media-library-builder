---
name: obsidian-media-library-builder
description: Safely build or expand an offline Obsidian movie/TV media library from user-supplied CSV or JSON, with Markdown notes, catalog, and a standalone HTML wall preview. 支持从用户自己的 CSV 或 JSON 文件安全创建 Obsidian 影视库。
---

# Obsidian Media Library Builder / Obsidian 影音库构建

## Activation / 使用场景

Use when the user asks to create a personal movie/TV library inside Obsidian or import their own CSV/JSON collection. Do **not** claim this technical preview installs or reproduces the original Movie Wall plugin.

当用户希望从自己的片单创建 Obsidian 影音库时使用。请**不要**将此技术预览版声称为已复现原版 Movie Wall 插件。

## Ground rules / 操作规则

1. Ask for or locate the intended vault root and input CSV/JSON. Never assume access to the user's private library, NAS, or accounts.
2. Prefer a **new vault** unless the user explicitly chooses an existing one; advise a backup for existing vaults.
3. Do not import media files, private watch history, API credentials, or copyrighted poster packages into any publicly shared repository.
4. Run `import --dry-run` first; inspect errors. Never edit or delete files by hand to make a conflict disappear.
5. Execute `import` only after input and target are confirmed, then run `validate` and report actual results.
6. If metadata matching is ambiguous, keep it unresolved; never invent TMDB IDs, posters, release years, or scores.
7. Only present the HTML poster-grid as an **offline browser preview**. The original Obsidian Movie Wall plugin integration is not implemented yet.
8. Never silently overwrite hand-edited Obsidian notes; request explicit instructions before migrations or destructive operations.

## Commands / 操作命令

Run from this repository's root:

```bash
python scripts/media_library.py import --vault "/path/to/Vault" --input "/path/to/my-media.csv" --dry-run
python scripts/media_library.py import --vault "/path/to/Vault" --input "/path/to/my-media.csv"
python scripts/media_library.py validate --vault "/path/to/Vault"
```

For an empty library, run `python scripts/media_library.py init --vault "/path/to/Vault"`.

## Expected outputs / 交付内容

- `Media Library/Movies/*.md` — movie notes / 电影笔记
- `Media Library/TV Series/*.md` — TV notes / 剧集笔记
- `Media Library/catalog.json` — normalized catalog / 标准化目录
- `Media Library/Library Index.md` — Obsidian navigation / Obsidian 分类索引
- `Media Library/Wall Preview.html` — standalone preview / 浏览器独立预览

## Verification / 验收

Run `python -m unittest discover -s tests -v` for script regression tests. Report completed commands, imported item counts, explicit conflicts and gaps. Do not call untested integrations PASS.