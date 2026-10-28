# 架构与数据安全

输入 CSV/JSON → 字段验证 → 稳定 ID → Markdown 笔记、catalog.json、Obsidian 导航页、独立 HTML 预览。

仅向用户指定库的 `Media Library/` 写入。拒绝覆盖未管理的笔记和索引。单文件写入使用原子替换，但整体导入不属于数据库事务，请先备份。推荐提供固定 ID，避免重命名时产生新条目。

当前仓库已包含本项目的 Obsidian 原生海报墙模块与 HTML 预览，作者此前本地开发的 Movie Wall 旧版代码尚未合并。当前不提供 TMDB 刮削、海报自动下载、视频文件或独立手机应用；Obsidian 移动端适配仍待实际验收。
