# Original integration audit / 原版整合审查

The author-provided original `movie-wall` plugin 1.5.0 was located and copied read-only before editing. Only main.js, manifest.json and styles.css were copied; no catalog, poster collection, plugin data.json or watch history was imported or published. Catalog structure was sampled read-only. No original vault file was modified. Bounded searches covered the original plugin directory, `source`, `scripts` and the named nested media project; no TypeScript/build configuration was found. Original QA harnesses were adapted using synthetic fixtures.

本轮先复制原版插件做工作副本，原库只读；未发布私人 catalog、海报、观看历史或 data.json。原文件路径不写入公开资料。

| Capability | Previous public 0.2 | Original 1.5 | Public 0.3 |
|---|---|---|---|
| CSV/JSON import, protected notes | Yes | Private enrichment workflow | Retained and hardened |
| Native wall, search, movies/TV | Basic | Mature layout | Original implementation integrated |
| Genre and year/rating sorting | Yes | Absent | Added to original wall |
| Collections, nested navigation | No | Yes | Retained |
| Season/part/special model and progress | No | Yes | Runtime retained; CLI imports basic seasons |
| Long press, selection and trash rollback | No | Yes | Retained with path boundaries |
| Scroll navigation, parent restoration | No | Yes | Retained |
| Note link and personal rating control | Note link only | Personal fields preserved | Both explicit controls added |
| Missing/unsafe image handling | Basic | Local + remote URL | Local-only; image error fallback added |
| Watch persistence | user-state.json | Frontmatter | Frontmatter plus legacy override compatibility |
| Metadata enrichment and streaming checks | No | Separate private scripts | Not included; unknown stays unknown |

Changes are deliberately localized to resource paths, schema compatibility, filters, note/rating controls, safe installation and truthful unknown-data labels. Original source uses only Obsidian APIs and browser facilities; no third-party runtime dependency or bundled artwork was found. CSS includes light/dark Obsidian variables and mobile layouts. The original author identified this as their own project and authorized public integration under the repository's MIT license.

Original source SHA-256:
- `main.js`: `259523e676e97c4d4baf2aba04c6f3169aea8604aa145fa2e23a07b27964ebff`
- `manifest.json`: `56ed2441a4f010a6847be60b3c175020909f711185fbb2d73e6bd537bff06bb9`
- `styles.css`: `974cb67610ceda40f58e94f0ce1fa7c27e0a40d605d152da2233582c863e466d`
