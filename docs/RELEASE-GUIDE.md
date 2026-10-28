# GitHub Release Guide / GitHub 正式发布指南

This is an **original open-source project by brianXx123**. Keep the release notes factual: distinguish checked source/tests from an actual Obsidian runtime screenshot. / 本项目由 brianXx123 原创，发布内容应严格区分已验证代码、真实 Obsidian 运行截图与待验收项目。

## 1. Release stages / 发布阶段

| Stage | Tag example | GitHub release type | When to use |
| --- | --- | --- | --- |
| Development preview / 开发预览 | `v0.2.0-preview.1` | **Pre-release / 预发布** | Existing code can be tested, but real Obsidian desktop/mobile checks or old Movie Wall integration are missing |
| Release candidate / 候选版 | `v1.0.0-rc.1` | **Pre-release / 预发布** | Full feature baseline and installation are implemented; testing still in progress |
| Stable / 正式稳定版 | `v1.0.0` | **Full release / 正式发布** | Verified desktop/mobile run, safe install, accurate screenshots, complete package |

Do not tag the current `main` branch `v1.0.0` without passing actual application acceptance tests.

目前不建议把未完成实测的 `main` 当作 `v1.0.0` 稳定版。

## 2. Before publishing / 发布前检查

1. Commit source, bilingual README, SKILL.md, changelog, license and supported example data.
2. Run `python -m unittest discover -s tests -v` and `node --test tests/plugin.test.cjs`; verify GitHub Actions independently.
3. Test in a clean desktop Obsidian vault; then a real mobile vault if claiming mobile compatibility.
4. Capture **actual Obsidian** screenshots and attach only images from the verified version. Do not publish AI concept renders as completed product.
5. Inspect packages to ensure there is no personal media list, account data, credential, proprietary movie artwork, or unnecessary local path.
6. Document limitations and installation steps in English and Chinese.

## 3. Publish through GitHub website / 网页发布步骤

1. Open **https://github.com/brianXx123/obsidian-media-library-builder/releases**.
2. Click **Draft a new release**.
3. Select **Choose a tag → Create new tag**. Use `v0.2.0-preview.1` for a preview, or `v1.0.0` **only after** formal acceptance. Target branch: `main`.
4. Release title: `Obsidian Media Library Builder v0.2.0 Preview / 技术预览` (for preview).
5. Add bilingual notes: features actually implemented, verified environments, breaking changes, known limitations, install command.
6. Attach verified assets if available:
   - `obsidian-media-library-builder-vX.Y.Z.skill` (complete Skill package)
   - `media-library-wall-vX.Y.Z.zip` (the three files from `plugin/`)
   - optional source or checksum, and **genuine** screenshots.
   GitHub automatically offers source-code ZIP and tarball for a tag; you do not need to manually attach those.
7. **Select 'This is a pre-release'** for preview or RC builds. For a stable build, leave it unchecked.
8. Preview/review the release notes and asset list. Publish the release only when all required files are attached.

When release immutability is enabled, GitHub may lock assets and tag contents after publication; draft and verify assets **before** publishing.

## 4. Suggested release-note text / 双语发布说明模板

### English

**Obsidian Media Library Builder** is an original open-source project for generating personal movie and TV libraries in Obsidian.

**Included:** CSV/JSON importer, Markdown notes and catalog, native poster-wall view, filtering and sorting, local poster support, status persistence, English/Chinese documentation, AI Skill.

**Verification:** [Exact tested OS/app version and results; do not invent].

**Known limitations:** [Only unresolved issues that actually apply to the released commit].

**Install:** [Link to README and plugin guide].

### 简体中文

**Obsidian Media Library Builder** 是面向个人影视收藏的原创开源 Obsidian 影音库构建项目。

**本版包含：** CSV/JSON 导入、Markdown 作品笔记及目录、Obsidian 海报墙、搜索筛选与排序、本地海报、观看状态记录、双语文档及 AI Skill。

**验收记录：** [填写确实测试的系统、Obsidian 版本与结果，不得臆造]。

**已知限制：** [对应实际发布版本填写未完成项目]。

**安装方式：** [链接至 README 和插件安装教程]。

## 5. Updating after a release / 后续更新

Commit fixes, increase version consistently (manifest, docs and package names), rerun tests, and create a new tag and Release. Do not silently substitute a newer binary under an older release tag. Prefer a new version for reproducibility.

每次修复应重新测试、更新版本号并创建新的 Release，不应在已正式发布的同一标签下悄悄更换安装包。
