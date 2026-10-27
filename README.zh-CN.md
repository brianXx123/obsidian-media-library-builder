<div align="center">

# Obsidian Media Library Builder

**离线优先、AI 辅助的 Obsidian 个人影音库构建工具。**

[English](README.md) · [简体中文](README.zh-CN.md)

![Stage](https://img.shields.io/badge/stage-technical%20preview-orange) ![Python](https://img.shields.io/badge/Python-3.10%2B-blue) ![License](https://img.shields.io/badge/license-MIT-green)

</div>

> [!IMPORTANT]
> **当前为技术预览版，而不是原始 Movie Wall 的正式移植版。** 本仓库已经提供可测试的 AI Skill、CSV/JSON 导入、Markdown 作品笔记、目录数据及独立的离线海报墙预览。但目前**尚未包含作者原有的 Obsidian Movie Wall 插件源码及真实软件截图**。这些内容必须在确认源码、授权和实际兼容性后整合，才能发布功能对等的正式版本。

## 界面预览（生成的示例，**不是**原版 Movie Wall）

_已验证的截图将在二进制资产上传后补充。_

*后续仅添加真实运行的 HTML 预览截图，使用虚构示例作品；并非作者原有 Obsidian 插件的实际截图。*

## 它能做什么

- 在指定的 Obsidian 库中建立 `Media Library/` 目录，不主动删除已有笔记。
- 导入用户自己的电影、电视剧 CSV/JSON 清单；示例文件仅包含虚构作品。
- 自动生成带 YAML 属性的 Markdown 笔记、统一作品目录和可点击的分类索引。
- 创建带搜索、类型和观看状态筛选的独立离线 HTML 海报墙预览，无需安装插件。
- 提供稳定 ID、试运行、数据验证、冲突检测和原子写入；不会悄悄覆盖被手工修改的作品笔记。
- 仅依赖 Python 标准库，不需要 API 密钥，也不会擅自抓取网络影视资料。

### 当前限制

这一预览版**还不能直接复现作者原有的 Obsidian 内置 Movie Wall 界面**。目前不支持 TMDB 在线刮削、自动下载海报、自动安装社区插件、双向同步或已通过测试的移动端交互。海报使用用户提供的本地相对路径。HTML 海报墙仅供浏览器打开，不能冒充原版 Obsidian 插件。

## 三步上手

安装 Python 3.10 或更新版本；使用 Obsidian 打开生成的库。在项目根目录运行：

```bash
# 只检查将要生成的内容，不写入文件
python scripts/media_library.py import --vault "./我的Obsidian库" --input examples/sample.csv --dry-run

# 用两条虚构示例记录生成影音库
python scripts/media_library.py import --vault "./我的Obsidian库" --input examples/sample.csv

# 验证目录与作品笔记
python scripts/media_library.py validate --vault "./我的Obsidian库"
```

在 Obsidian 中打开 `Media Library/Library Index.md` 查看作品索引；在浏览器中打开 `Media Library/Wall Preview.html` 查看独立海报墙预览。

如果想从一个空库开始：

```bash
python scripts/media_library.py init --vault "./我的Obsidian库"
```

> **数据安全：** 建议先用全新测试库执行，并在导入已有库前备份。程序在检测到同名冲突笔记或未知版本目录时会拒绝继续；它不会主动删除用户笔记。详细规则见 [架构和数据安全](docs/ARCHITECTURE.zh-CN.md)。

## 导入字段

支持：`id`、`type`、`title`、`original_title`、`year`、`genres`、`rating`、`watched`、`overview`、`poster`、`tmdb_id`。

- `title` 必填；`type` 可为 `movie`/`tv` 或相应中文名称。
- `genres` 支持 CSV 中逗号、分号分隔，或 JSON 字符串数组。
- `rating` 范围是 0–10；`watched` 支持 true/false、yes/no、已看/未看。
- `poster` 可选，只接受相对本地路径；不附带、不下载图片。
- `id` 可选，未提供时生成确定性 ID；正式数据建议提供稳定的唯一 ID。

见 [`examples/sample.csv`](examples/sample.csv)。

## AI Skill

[`SKILL.md`](SKILL.md) 告诉兼容的 AI 编程助手如何检查用户数据、试运行以及安全建立 Obsidian 库。即使不使用 AI，也可以直接使用命令行工具。可按所使用 AI 工具的 Skill 安装机制导入整个项目；不同 AI 工具的安装路径并不完全相同。

## 路线图与开发

优先目标是完善可复现、安全可靠的交付流程，随后再接入原始 Movie Wall 界面。所有功能按**已经实现、计划实现、等待源码**区分，详见 [路线图](docs/ROADMAP.md)。

```bash
python -m unittest discover -s tests -v
python -m compileall -q scripts
```

CI 会在 Linux 和 Windows 上运行自动化测试。欢迎提交 Issue 和 PR，详见 [贡献指南](CONTRIBUTING.md)。请勿上传私人影音库、密钥、受版权保护的海报包或视频文件。

## 声明及许可证

这是独立社区工具，与 Obsidian 官方、TMDB 无隶属关系。产品名称和商标归各自权利人所有；外部元数据、海报必须遵守对应服务条款和版权许可。

仓库中原创的**预览版代码和文档**使用 MIT 许可证。日后接入的 Movie Wall 原插件源码及第三方图片，须单独完成授权核对后才能公开。