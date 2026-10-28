# 0.3.0 Preview / 预发布

Original Obsidian Media Library Builder by **brianXx123**. This preview integrates the author's located Movie Wall 1.5.0 implementation into the public AI Skill and importer.

Included: native posters, movies/TV, search, genres, sorting, collections, season dialogs and watched-season progress; note opening, personal ratings, protected CSV/JSON imports, interrupted-build recovery, plugin upgrade backups and bilingual documentation. Screenshots show actual Obsidian, not concept renders.

Verified locally: 20 Python tests, 8 Node entries including original interaction harnesses, Skill structure validator, empty-vault import/repeat/conflict checks, extracted Skill installation, exact three-file plugin ZIP and SHA-256. Actual Windows Obsidian 1.14.5 and Android 16 emulator Obsidian Mobile 1.14.4 passed library/detail/filter/note and state reload. Public demo: 24 works, 16 individually checked historical posters; poster sources are excluded from every package. Original real-phone footage was reviewed separately; it does not establish current-version physical-phone acceptance.

Install the Skill by extracting its single skill directory into your compatible agent's skills directory. Extract the plugin ZIP's three files into `<vault>/.obsidian/plugins/media-library-wall/`, then enable it in Obsidian. Python 3.10+; Obsidian 1.5.0+. Existing users: back up, close Obsidian and use the explicit `install-plugin --upgrade`; prior plugin files/data.json are backed up. The original private Chinese vault layout is not automatically migrated. Some 0.2 import metadata changes require explicit conflict resolution; existing notes can still be read.

Known limits: original UI remains primarily Chinese; full translations, advanced season/part import, automated metadata merges/migration, full virtualization and community-directory submission remain future work. No TMDB lookup, artwork downloader or streaming-availability checker. macOS/Linux desktop UI, iOS and physical Android 0.3.0 are NOT RUN. See docs/VALIDATION-v0.3.0.md and docs/screenshots/metadata.json for exact evidence.

Tag **0.3.0** exactly matches the plugin manifest. GitHub status is **Pre-release**; this is not stable 1.0 and not an approved Community Plugins listing. Attachments: Skill, plugin ZIP, SHA256SUMS.txt, main.js, manifest.json, styles.css. Code/docs MIT; artwork retains its documented status.

---

本项目由 **brianXx123 原创**。本预览版已找到并整合原 Movie Wall 1.5.0，保留合集、季详情、观看进度及原生交互，并加入类型/排序、笔记跳转、个人评分、安全导入、异常恢复及升级备份。中英文文档和实际 Obsidian 截图同步提供。

本地 20 项 Python 测试、8 个 Node 测试入口、Skill 校验、空白库导入/重复/冲突、解压后 Skill 安装、插件 ZIP 内容及 SHA-256 均通过。Windows Obsidian 1.14.5 与 Android 16 模拟器 Obsidian Mobile 1.14.4 完成真实浏览、详情、筛选、笔记和状态重载验收。演示库共 24 部，16 张逐文件核实的历史海报；源海报不打包。原版真机录像单独审阅，不能证明新版已在实体手机测试。

Skill 解压单一技能目录到兼容 AI 客户端的技能目录；插件三个文件放入目标库的 `.obsidian/plugins/media-library-wall/` 后启用。需要 Python 3.10+、Obsidian 1.5.0+。升级前备份并关闭 Obsidian，`install-plugin --upgrade` 会备份旧插件文件和 data.json。原中文私人库不自动迁移；部分旧版导入元数据需明确解决冲突，原笔记仍可读取。

尚未完成全界面翻译、复杂季/分段导入、元数据自动合并与迁移、完整虚拟化和插件商店审核；不提供自动资料/海报下载或流媒体核验。macOS、Linux 原生界面、iOS 和实体手机 0.3.0 为 NOT RUN。标签为纯数字 **0.3.0**，明确标记预发布，不冒充 1.0 稳定版或商店上架。详细证据见验收报告。
