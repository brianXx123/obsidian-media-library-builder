# Architecture and Safety / 架构与安全

CSV/JSON → validation → normalized item IDs → Markdown, catalog JSON, index, standalone HTML preview.

Files are generated only inside the specified vault's `Media Library/` directory. Existing unmanaged notes and indexes are not overwritten. Individual output files are atomically replaced, but a multi-file import is not a database transaction. The user must back up an existing vault before use. For long-term data, supply immutable IDs: automatically derived IDs depend on title, type, and year.

This version does not include the original Movie Wall plugin, online metadata, poster downloading, or video files. The HTML preview uses placeholders and is not the Obsidian in-app Movie Wall.

源码仅处理用户明确选择的 CSV/JSON 和 Vault。不会自行获取电影或电视剧素材，不会删除用户笔记。跨文件写入不是单个事务，建议先备份。
