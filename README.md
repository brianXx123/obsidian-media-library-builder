<div align="center">

# Obsidian Media Library Builder

**An offline-first, AI-assisted toolkit for creating personal movie and TV libraries in Obsidian.**

[English](README.md) · [简体中文](README.zh-CN.md)

![Stage](https://img.shields.io/badge/stage-technical%20preview-orange) ![Python](https://img.shields.io/badge/Python-3.10%2B-blue) ![CI](https://img.shields.io/badge/tests-unittest-informational) ![License](https://img.shields.io/badge/license-MIT-green)

</div>

> [!IMPORTANT]
> **Technical preview — not the original Movie Wall release.** This repository is a tested starter implementation with a reusable AI Skill, CSV/JSON importer, Markdown notes, catalog, and standalone offline wall preview. It **does not yet include** the author's existing Obsidian Movie Wall plugin or genuine product screenshots. Those assets must be reviewed, licensed, and integrated before a feature-parity release.

## Interface preview (generated sample, **not** the original Movie Wall)

_Screenshot pending verified binary upload._

*The screenshot will be included only after image upload is verified. It is not a screenshot of the author's original Obsidian plugin.*

## What it does

- Creates a non-destructive `Media Library/` structure inside a chosen Obsidian vault.
- Imports your own movie and TV data from UTF-8 CSV or JSON (no sample collection included beyond fictional examples).
- Generates individual Markdown notes with YAML frontmatter, a catalog, and a navigable Markdown index.
- Produces a standalone, offline HTML poster-grid preview with search and filters, without installing an Obsidian plugin.
- Uses deterministic IDs, dry-run, validation, conflict detection and atomic file replacement; refuses to silently replace edited notes.
- Works with Python's standard library; no scraping, cloud account, API key, or third-party Python package required.

### Current limitations

This **does not recreate the original in-app Movie Wall interface**. There is no TMDB scraper, automatic poster downloading, Obsidian community-plugin installer, two-way synchronization, or verified mobile interaction in the preview. Poster paths refer to your own local assets. The generated HTML wall runs in a browser, not as the original Obsidian plugin. See [roadmap](docs/ROADMAP.md).

## Quick start

Requirements: Python 3.10+ and Obsidian (to use the generated Markdown vault). Run from the project root:

```bash
# Preview changes before writing
python scripts/media_library.py import --vault "./My Obsidian Vault" --input examples/sample.csv --dry-run

# Create the library using two fictional sample entries
python scripts/media_library.py import --vault "./My Obsidian Vault" --input examples/sample.csv

# Validate generated entries
python scripts/media_library.py validate --vault "./My Obsidian Vault"
```

Open `My Obsidian Vault` as a vault in Obsidian and navigate to `Media Library/Library Index.md`. Open `Media Library/Wall Preview.html` in your browser to inspect the separate preview.

For an empty library, run:

```bash
python scripts/media_library.py init --vault "./My Obsidian Vault"
```

> **Data safety:** Use a fresh test vault first and make backups before importing into an existing vault. The tool stops on colliding note paths and unknown catalog versions. It never deliberately deletes notes. See [architecture and safety](docs/ARCHITECTURE.md).

## Import format

Supported fields: `id`, `type`, `title`, `original_title`, `year`, `genres`, `rating`, `watched`, `overview`, `poster`, `tmdb_id`.

- `title` is required; `type` is `movie` or `tv` (Chinese labels also accepted).
- `genres` accepts comma/semicolon-separated text in CSV or a string array in JSON.
- `rating` is 0–10; `watched` supports true/false, yes/no and 已看/未看.
- `poster` is optional and must be a local relative path. Images are **not included or downloaded**.
- `id` is optional and is generated deterministically when missing. For production data, supplying stable IDs is recommended.

See [`examples/sample.csv`](examples/sample.csv) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## AI Skill

[`SKILL.md`](SKILL.md) teaches compatible AI coding agents how to inspect a user's input, run preflight checks, and build a vault safely. It does not require an agent: the CLI works independently. Copy or install the whole repository under a skill directory as supported by your AI agent, or provide the skill file and scripts in its workspace. Exact installation paths vary by agent.

## Roadmap

Our first goal is a trustworthy, reproducible publishing pipeline; the original Movie Wall experience is the next integration stage. See [ROADMAP.md](docs/ROADMAP.md) for features separated into **implemented**, **planned**, and **blocked awaiting source assets**.

## Development

```bash
python -m unittest discover -s tests -v
python -m compileall -q scripts
```

CI runs the test suite on Linux and Windows. Contributions and issue reports are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Please do not upload private libraries, API keys, copyrighted poster collections, or media files to issues or pull requests.

## Acknowledgments & trademark notice

This is an independent community project, not affiliated with the Obsidian team or TMDB. Obsidian and other names belong to their respective owners. Third-party metadata and artwork must be used under their own terms and licenses.

## License

MIT for the original **preview code and documentation in this repository**. Any future imported Movie Wall plugin source or third-party artwork requires separate rights review before inclusion.