# Media Library Wall 0.3.0 / 影音海报墙

Original project by brianXx123. Integrates the author's Movie Wall 1.5.0 into the public builder layout. Obsidian 1.5.0+; `isDesktopOnly: false`.

Extract the plugin ZIP's three files into `<vault>/.obsidian/plugins/media-library-wall/`, open the vault, enable Media Library Wall in Community plugins, and use the clapperboard ribbon or Open Media Library command. Close Obsidian during installation/upgrades. The CLI provides safe install and `--upgrade` with backups.

The wall reads generated note frontmatter. It supports search, movies/TV, genres, sorting, collections and seasons. Watched state and personal ratings edit only their frontmatter fields. Legacy user-state overrides remain readable. Imported scores never silently become personal scores. Images must be local vault raster files; missing images show placeholders. No metadata service is queried.

中文：三个文件放入插件目录，在 Obsidian 第三方插件页面启用。支持搜索、分类、筛选、排序、合集、季级观看和个人评分；观看数据写入笔记属性。安装升级前关闭应用，升级使用 CLI 备份。海报仅支持库内图片，缺失显示占位。
