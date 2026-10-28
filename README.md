<div align="center">

# Obsidian Media Library Builder

**An original open-source project by brianXx123: build your own Obsidian movie & TV library with an AI Skill, a CLI, and a native poster-wall plugin.**

[English](README.md) · [简体中文](README.zh-CN.md)

![Stage](https://img.shields.io/badge/stage-0.2.0--preview-orange) ![Python](https://img.shields.io/badge/Python-3.10%2B-blue) ![License](https://img.shields.io/badge/license-MIT-green)

</div>

> [!IMPORTANT]
> **Original project / 原创项目.** The concept, product direction, and media-library workflow were created by **brianXx123**. The public repository contains the current working generator and native Obsidian plugin. The author's earlier Movie Wall source code and real Obsidian screenshots have not yet been added, so exact visual and interaction parity with that earlier build is not claimed. Native desktop/mobile verification remains pending. **Concept renders are not shown as actual screenshots.**

## Features / 功能

| Component | What it actually does |
| --- | --- |
| AI Skill (`SKILL.md`) | Guides supported agents through import, safety checks and local plugin installation |
| CLI (Python, standard library only) | Imports UTF-8 CSV/JSON, normalizes records, creates notes and a catalog |
| Obsidian plugin (`plugin/`) | In-app poster grid, title search, movie/TV + genre + watched filters, rating/year sorting |
| Native detail dialog | Title, original title, year, genres, rating, description and link to the original note |
| Watch tracking | Saves changes in `Media Library/user-state.json` without rewriting imported notes or the catalog |
| Offline browser preview | Searchable HTML poster wall, including vault-local posters where available |
| Documentation | English + Simplified Chinese setup, data safety, roadmap and contribution notes |

**Not yet included or verified:** the earlier Movie Wall build's complete UI/interaction design; automatic TMDB matching or artwork downloads; season and collection editing; GUI drag-and-drop importer; verified Obsidian desktop/mobile screenshots. See the [roadmap](docs/ROADMAP.md).

## Quick start / 快速开始

Requires Python 3.10+ and [Obsidian](https://obsidian.md). Run from this repository root.

```bash
# 1. Test against a new vault with fictional demo data
python scripts/media_library.py import --vault "./My Vault" --input examples/sample.csv --dry-run
python scripts/media_library.py import --vault "./My Vault" --input examples/sample.csv
python scripts/media_library.py validate --vault "./My Vault"

# 2. Copy the three native plugin files safely into this vault
python scripts/media_library.py install-plugin --vault "./My Vault" --dry-run
python scripts/media_library.py install-plugin --vault "./My Vault"
```

In Obsidian, open `My Vault`, go to **Settings → Community plugins**, and manually enable **Media Library Wall**. Open it via the film ribbon icon or command palette: **Open Media Library / 打开影音库**. No plugin is silently activated.

The plugin is manually installable from `plugin/manifest.json`, `plugin/main.js` and `plugin/styles.css` as well. Place all three files in `<vault>/.obsidian/plugins/media-library-wall/`. See [plugin guide](plugin/README.md).

For a vault containing no titles yet:

```bash
python scripts/media_library.py init --vault "./My Vault"
```

For an existing vault, **make a backup first**. The builder refuses to overwrite unmanaged conflicting notes or an unknown catalog; the plugin installer refuses to overwrite differing preexisting plugin files.

## Import format

Required: `title`. Optional: `id`, `type` (`movie` / `tv` / 中文别名), `original_title`, `year`, `genres`, `rating` (0–10), `watched`, `overview`, `poster`, `tmdb_id`. UTF-8 CSV and JSON are supported. Use a stable explicit `id` for production libraries so title changes do not create separate records.

- Poster assets are **not included**. The `poster` column refers only to an existing vault-local path, such as `Media Library/posters/example.jpg`.
- User-specific collections, actual videos, personal watch histories and private API keys should **never** be uploaded to a public fork.
- No TMDB/IMDb scraping or data services are called.

Sample inputs: [CSV](examples/sample.csv) · [JSON](examples/showcase.json). Architecture: [EN](docs/ARCHITECTURE.md) · [中文](docs/ARCHITECTURE.zh-CN.md).

## AI Skill

The [SKILL.md](SKILL.md) file explains safe import and validation to a compatible AI coding agent. Supply this repository as a skill directory in an environment where the agent can execute the CLI and access the intended vault. The Skill is **not itself** a remote NAS connection or always-on service.

## Verification

```bash
python -m unittest discover -s tests -v
node --check plugin/main.js
node --test tests/plugin.test.cjs
```

The repository contains GitHub Actions for Windows and Linux. **Automated contract tests are not a substitute for a manual Obsidian desktop + mobile test.** See the [test plan](docs/TESTING.md).

## Project status & transparency

This is **v0.2.0-preview** (source on `main`), not an official release or an Obsidian Community Plugins listing. It is an original open-source project maintained by brianXx123, unaffiliated with Obsidian or TMDB. No real film posters are bundled and no imagined GUI screenshots are presented as a finished product.

[Roadmap](docs/ROADMAP.md) · [Release guide / 发布指南](docs/RELEASE-GUIDE.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Change log](CHANGELOG.md) · [Plugin installation](plugin/README.md)

## License

MIT covers the code and documentation committed here. Reintegrating the author's earlier local Movie Wall code requires checking its dependencies and any third-party assets; images and metadata remain subject to their respective licenses.
