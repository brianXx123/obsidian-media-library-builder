# 0.3.1 Publishing Verification / 0.3.1 发布验收

**Published:** [0.3.1 Preview / 预发布](https://github.com/brianXx123/obsidian-media-library-builder/releases/tag/0.3.1), 2026-10-28. This checklist records the **actual verified release** rather than an outdated pending-tag plan.

| Gate / 验收项 | 0.3.1 status / 状态 |
|---|---|
| Original Movie Wall source integrated / 原版源码整合 | PASS — [source audit](ORIGINAL-INTEGRATION.md) |
| Bilingual README, Skill and install docs / 双语文档 | PASS |
| Safe CLI, importer, recovery and plugin upgrade / 安全导入及升级 | PASS — [validation](VALIDATION-v0.3.1.md) |
| Real Windows Obsidian 1.14.5 desktop screenshots / 真实桌面截图 | PASS — seven native 0.3.1 captures |
| Android emulator Obsidian Mobile 1.14.4 / 安卓模拟器 | PASS — original 0.3.0 captures and unchanged 0.3.1 JS/CSS runtime; **not** a new 0.3.1 native run |
| Public screenshot artwork source records / 截图素材来源 | RECORDED — [ARTWORK.md](ARTWORK.md); separate rights may apply by jurisdiction |
| Windows/Linux GitHub CI jobs / 自动化测试 | PASS — [4/4 jobs](https://github.com/brianXx123/obsidian-media-library-builder/actions/runs/40657504948) at tested commit |
| Publish workflow / 预发布流程 | PASS — [successful workflow](https://github.com/brianXx123/obsidian-media-library-builder/actions/runs/40657665077) |
| Six assets / 六个附件 | PASS — Skill, plugin ZIP, checksums, individual main.js, manifest.json, styles.css |
| Numeric release tag matching manifest / 版本标签一致性 | PASS — `0.3.1` |
| Source images/private vault excluded / 私人数据与海报源文件排除 | PASS per published package validation |
| Stable 1.0 and Community Plugins directory / 稳定版或 Obsidian 商店 | NOT RELEASED / 尚未发布 |
| Native iOS, macOS, Linux and physical Android 0.3.1 / 其他原生设备 | NOT RUN |

**Version consistency:** The full 0.3.1 release has already been published. The mobile images intentionally retain their 0.3.0 capture identity and are clearly labeled. No source screenshots have been digitally altered or replaced in the evidence directory.

**后续更新规则：** 本清单反映已发布版本，不应将后来 `main` 分支的文档更改冒充为 0.3.1 标签中的原始内容。新版本须重新核对 CI、完整性、环境与截图。

[Release guide](RELEASE-GUIDE.md) · [Validation report](VALIDATION-v0.3.1.md) · [FAQ](FAQ.md)
