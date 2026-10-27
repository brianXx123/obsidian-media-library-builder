<div align="center">

# Obsidian Media Library Builder

**用 AI Skill、Python 生成器和 Obsidian 原生海报墙插件，快速构建属于自己的影音库。**

[English](README.md) · [简体中文](README.zh-CN.md)

![Stage](https://img.shields.io/badge/stage-0.2.0--preview-orange) ![License](https://img.shields.io/badge/license-MIT-green)

</div>

> [!IMPORTANT]
> **当前是独立实现的兼容预览版，不是用户原版 Movie Wall 插件源码的移植。**
> 原插件源码和 Obsidian 实际截图尚未取得。本仓库已经提供可安装的 Obsidian 原生海报墙插件、命令行导入工具、AI Skill 和独立 HTML 浏览器预览。**插件已配置自动化契约测试，但还没有完成真实 Obsidian 桌面和手机端的人工验收。** 不使用 AI 概念图冒充成品。

## 已实现的功能

| 模块 | 功能 |
| --- | --- |
| AI Skill `SKILL.md` | 引导 AI 检查片单、试运行、导入并安全安装插件 |
| Python 命令行工具 | 导入 CSV/JSON；生成 Markdown 笔记、索引和 `catalog.json` |
| Obsidian 原生插件 | 海报网格、中文/英文片名搜索、电影/剧集/类型/观看状态筛选、排序 |
| 原生详情弹窗 | 作品名称、年份、评分、类型、简介、直接打开原 Markdown 笔记 |
| 观看状态 | 独立保存到 `Media Library/user-state.json`，不覆盖原始片单和笔记 |
| HTML 离线预览 | 浏览器中查看独立海报墙，可加载用户库内的本地海报文件 |
| 项目文档 | 中英双语 README、安装教程、架构、安全与开发路线图 |

**尚未实现**：原版 Movie Wall 视觉和交互完全一致、TMDB 自动检索/海报下载、季/合集交互管理、拖拽 GUI、真实桌面和移动端 Obsidian 完整验收。请查看[路线图](docs/ROADMAP.md)。

## 快速安装

需要 Python 3.10+ 和 [Obsidian](https://obsidian.md)。在项目根目录执行：

```bash
# 1. 用虚构的示例作品生成新的影音库
python scripts/media_library.py import --vault "./我的Obsidian库" --input examples/sample.csv --dry-run
python scripts/media_library.py import --vault "./我的Obsidian库" --input examples/sample.csv
python scripts/media_library.py validate --vault "./我的Obsidian库"

# 2. 将 Obsidian 插件安装至该库（不修改用户启用设置）
python scripts/media_library.py install-plugin --vault "./我的Obsidian库" --dry-run
python scripts/media_library.py install-plugin --vault "./我的Obsidian库"
```

打开 Obsidian，选择上述库，在**设置 → 第三方插件（Community plugins）**中手动启用 **Media Library Wall**。然后点击左侧电影图标或命令面板的 **Open Media Library / 打开影音库**。

你也可以手动把 `plugin/` 目录中的 `main.js`、`manifest.json`、`styles.css` 放到 `<库目录>/.obsidian/plugins/media-library-wall/`。完整步骤见 [插件说明](plugin/README.md)。

空库初始化：

```bash
python scripts/media_library.py init --vault "./我的Obsidian库"
```

**注意：** 对已有笔记库操作前务必备份。生成器拒绝覆盖不属于自己的冲突笔记，插件安装器拒绝覆盖内容不同的既有插件文件，不会偷偷启用第三方插件。

## 支持哪些数据？

`title` 必填；其余为 `id`、`type`、`original_title`、`year`、`genres`、`rating`、`watched`、`overview`、`poster` 和 `tmdb_id`。支持 UTF-8 CSV 或 JSON，电影/剧集可使用中文类型别名。

- 建议使用固定 `id`，避免以后修改片名导致生成新记录。
- `poster` 是**库内部的相对文件路径**，例如 `Media Library/posters/example.jpg`；不自带海报，也不进行自动抓取。
- 本仓库不包含作者的私人影视库、任何影片文件或 API 密钥。

示例：[CSV](examples/sample.csv) · [JSON](examples/showcase.json)。

## 技术、Skill 与验收

AI Skill 见 [SKILL.md](SKILL.md)。它是一套给 AI 使用的构建流程，不是独立网页软件，也不会自动连接你电脑上的 NAS。

本地测试：

```bash
python -m unittest discover -s tests -v
node --check plugin/main.js
node --test tests/plugin.test.cjs
```

CI 在 Windows 和 Linux 测试。自动化测试与 Obsidian 实际桌面/手机端测试需要分开记录，详见[验收清单](docs/TESTING.md)。

## 发布状态

当前为 **v0.2.0-preview**，已提交 GitHub 源码，但不是正式 Release，也尚未进入 Obsidian 社区插件商店。所有效果展示必须取自真实运行的程序，不使用 AI 想象界面。

[路线图](docs/ROADMAP.md) · [安全说明](SECURITY.md) · [贡献指南](CONTRIBUTING.md) · [更新日志](CHANGELOG.md)

本项目与 Obsidian、TMDB 官方无隶属关系。仓库原创源码及文档采用 MIT 许可证，任何第三方海报、原版 Movie Wall 源码仍需独立核实许可后才能发布。
