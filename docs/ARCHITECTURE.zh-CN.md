# 架构与数据安全

输入 CSV/JSON → 字段验证 → 稳定 ID → Markdown 笔记、catalog.json、Obsidian 导航页、独立 HTML 预览。

仅向用户指定库的 `Media Library/` 写入。拒绝覆盖未管理的笔记和索引。单文件写入使用原子替换，但整体导入不属于数据库事务，请先备份。推荐提供固定 ID，避免重命名时产生新条目。

当前不包含原版 Movie Wall 插件、TMDB 刮削、海报下载、视频文件或原生手机界面。
