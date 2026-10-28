# FAQ / 常见问题

[English](#english) · [简体中文](#简体中文)

## English

### 1. Should I install the AI Skill or the Obsidian plugin?

**Use the Skill** if you want an AI coding assistant to create a vault, import CSV/JSON and safely install the plugin. **Use the plugin ZIP** if you already have a supported vault and only need the in-app Movie Wall. The Skill can install the plugin, so most first-time AI-assisted setups should start with the Skill.

- [Latest preview release](https://github.com/brianXx123/obsidian-media-library-builder/releases/tag/0.3.1)
- [Full CLI input schema and recovery](../references/schema.md)

### 2. Do I need an API key, a NAS, or a streaming subscription?

No. Python 3.10+ and Obsidian are sufficient for a new local library. The importer does **not** fetch TMDB/IMDb metadata, movie files, or poster images automatically. You provide your own records and, optionally, local artwork paths.

### 3. The poster wall has blank placeholders — is that a bug?

Not necessarily. A `poster` path must refer to an existing image inside your vault, such as `Media Library/posters/film.jpg`. Missing or unauthorized images deliberately use a placeholder. Demo poster **source files are not bundled**; the screenshots are recorded evidence of an isolated demo.

### 4. How do I install the Skill?

Download `obsidian-media-library-builder-v0.3.1.skill` from [Releases](https://github.com/brianXx123/obsidian-media-library-builder/releases/tag/0.3.1). It is a ZIP-format bundle containing a single `obsidian-media-library-builder/` directory. Extract it to your AI agent's supported skills directory and reload skill discovery. Installation paths differ between clients. For Codex, the documented locations include `$CODEX_HOME/skills` and `~/.codex/skills`.

### 5. Can I use an existing Obsidian vault?

Yes, **back it up and close Obsidian** before batch import or upgrade. The importer previews changes using `--dry-run`, protects unmanaged notes, refuses conflicting metadata edits and supports documented recovery for interrupted operations. The installer requires `--upgrade` for version changes and backs up plugin files.

### 6. Why are my CSV entries rejected?

At minimum, each item needs `title`. Use UTF-8 CSV (with header row) or JSON; follow [the schema](../references/schema.md). Explicit stable IDs prevent duplicate items after title changes. If the CLI detects a conflict, inspect it rather than deleting the old note to bypass protection.

### 7. What operating systems are supported?

The repository has recorded real Windows Obsidian 1.14.5 and Android 16 emulator Obsidian Mobile 1.14.4 evidence (mobile screenshots represent plugin 0.3.0). Automated CLI/contract tests pass on Windows and Linux. macOS, Linux native Obsidian, iOS and physical-device plugin 0.3.1 are not recorded as complete native acceptance tests.

### 8. Why does the interface contain Chinese?

The author's original Movie Wall UI is primarily Chinese. The installation docs and AI Skill are bilingual. Full interface localization remains on the [roadmap](ROADMAP.md).

### 9. Can I download or stream movies using this project?

No. This project organizes **metadata and local Obsidian notes**. It is not a downloader, media streaming service, or video player.

### 10. Can I report a bug or contribute?

Yes. Use [GitHub Issues](https://github.com/brianXx123/obsidian-media-library-builder/issues/new/choose) with the provided bug report or feature request templates. Include only a **sanitized** test vault, versions, reproduction steps and logs; never disclose personal watch history or private metadata. See [CONTRIBUTING.md](../CONTRIBUTING.md) and [SECURITY.md](../SECURITY.md).

## 简体中文

### 1. 我应该安装 AI Skill 还是 Obsidian 插件？

如果希望由 Codex 等 AI 工具自动建立目录、导入片单和安装插件，**优先使用 Skill**；如果已经有兼容的 Obsidian 影音库，只想安装海报墙界面，可以下载插件 ZIP。Skill 也包含安装插件的流程。

### 2. 是否需要 API Key、NAS 或影视会员？

不需要。基础使用只需 Python 3.10+ 和 Obsidian。当前不自动下载电影、海报或通过 TMDB/IMDb 抓取元数据；用户提供个人片单及可选的本地图片。

### 3. 海报显示为空白占位怎么办？

先确认 `poster` 字段指向 Vault 内真实存在的图片，例如 `Media Library/posters/film.jpg`。缺少海报时显示占位是正常设计。**演示截图中的海报源文件不附在公开安装包中。**

### 4. Skill 怎么安装？

在 [0.3.1 Release](https://github.com/brianXx123/obsidian-media-library-builder/releases/tag/0.3.1) 下载 `obsidian-media-library-builder-v0.3.1.skill`，这是包含一个 `obsidian-media-library-builder/` 目录的 ZIP 格式包。解压到 AI 客户端支持的 Skill 目录并重新加载。Codex 可参考 `$CODEX_HOME/skills` 或 `~/.codex/skills`；其他客户端路径和安装方式不尽相同。

### 5. 可以对已有的 Obsidian Vault 操作吗？

可以，但先**备份并关闭 Obsidian**。导入前运行 `--dry-run`；遇到原有笔记和元数据冲突时必须人工处理，不要靠删除文件绕过保护。插件升级使用 `install-plugin --upgrade`，保留旧插件备份。

### 6. CSV 导入失败怎么办？

检查 UTF-8 编码、CSV 表头与必填的 `title` 字段；尽量使用稳定 `id`。季、合集与更多字段请查阅[完整字段与恢复说明](../references/schema.md)。

### 7. 手机、macOS 和 iOS 能使用吗？

已有 Windows Obsidian 1.14.5 和 Android 16 模拟器的真实运行记录。当前公开手机截图对应插件 0.3.0；0.3.1 实体手机、iOS、macOS 和 Linux 原生 Obsidian 尚未列为已完成验收。跨系统的 Python/Node CI 通过不代表所有系统的 Obsidian UI 都验收通过。

### 8. 为什么 UI 仍有中文？

早期 Movie Wall 设计以中文界面为主。安装文档和 AI Skill 已双语；全量 UI 国际化仍在开发路线图中。

### 9. 可以下载或播放电影吗？

不能。本项目管理影视**资料、目录与 Obsidian 笔记**，不是影片下载、流媒体或视频播放软件。

### 10. 遇到 Bug 或有功能建议怎么反馈？

到 [GitHub Issues](https://github.com/brianXx123/obsidian-media-library-builder/issues/new/choose) 使用模板提交。请填写版本、复现步骤和脱敏日志，**不要上传私人影视库、API 密钥或观看记录**。也可阅读[贡献指南](../CONTRIBUTING.md)和[安全说明](../SECURITY.md)。
