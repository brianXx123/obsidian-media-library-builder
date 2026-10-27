---
name: obsidian-media-library-builder
description: Build a local-first Obsidian movie/TV library from a user's own CSV/JSON; safely install the native offline media wall plugin. 依据用户自己的片单生成 Obsidian 影音库，并安全安装原生海报墙。
---

# Obsidian Media Library Builder / Obsidian 影音库构建

Use when an end user wants a self-hosted/private Obsidian movie and TV library. This Skill contains instructions and calls repository-local Python commands; it is **not** an online service.

## Mandatory safety / 安全要求
1. Discover the actual vault path and user's own input CSV/JSON. Prefer a new vault; back up an existing one. Never use the author's private catalog or assume NAS access.
2. Inspect the input and validate title/type/year/IDs. Uncertain media matching must remain unresolved; no fabricated TMDB IDs, scores or posters.
3. Run `--dry-run` before writes. Do not delete anything or overwrite manually edited notes to bypass conflict checks.
4. Copy the native plugin only after the user wants it, and don't enable community plugins on their behalf. Refuse to overwrite unrelated or modified plugin files.
5. Verify actual notes, catalog, installer files, and checks. Do not claim Obsidian UI PASS merely because Python/Node tests passed.
6. Only vault-local images are supported. Never fetch movie posters, media files, or private watch data without separate permission.
7. The plugin is independently implemented and does **not** claim feature parity with the unavailable original Movie Wall.

## Procedure / 执行流程

```bash
python scripts/media_library.py import --vault "/path/to/vault" --input "/path/to/media.csv" --dry-run
python scripts/media_library.py import --vault "/path/to/vault" --input "/path/to/media.csv"
python scripts/media_library.py validate --vault "/path/to/vault"
python scripts/media_library.py install-plugin --vault "/path/to/vault" --dry-run
python scripts/media_library.py install-plugin --vault "/path/to/vault"
```

Ask the user to manually enable **Media Library Wall** in Obsidian Settings → Community plugins. The view can then be opened from the film ribbon or command palette.

## Outputs / 输出
- `Media Library/Movies/*.md` — movie notes / 电影笔记
- `Media Library/TV Series/*.md` — TV notes / 电视剧笔记
- `Media Library/catalog.json` — normalized catalog / 标准化目录
- `Media Library/Library Index.md` — Obsidian links / 索引
- `Media Library/Wall Preview.html` — separate offline browser preview / 独立浏览器预览
- `.obsidian/plugins/media-library-wall/` — native plugin files / 原生插件文件
- `Media Library/user-state.json` — watch-status overrides written only after interaction / 用户观看状态

## Validation / 验收
Run `python -m unittest discover -s tests -v` and `node --test tests/plugin.test.cjs` in the source repository when available. Report the exact checks executed and which UI environments still need manual tests. 
