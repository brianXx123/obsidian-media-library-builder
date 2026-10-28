# Architecture / 架构

`SKILL.md` directs an agent to the standard-library Python CLI. `normalize_record` validates user input; `run_build` preflights all conflicts, journals a batch and atomically writes notes/catalog/index/optional browser preview. The preview is a secondary diagnostic; Obsidian is the primary runtime.

The plugin's original MovieWallView reads note frontmatter through Obsidian metadataCache, caches normalized items, groups collections, filters/sorts and lazily loads local artwork. Movie/season/collection modals share a navigation stack with scroll restoration. Watched data and personal ratings use processFrontMatter and preserve note content. Legacy 0.2 watch overrides are read from user-state.json. Catalog data supports imports and delete transactions; it is not the current watch-history source.

Plugin installation changes only three files. Explicit upgrades retain a backup under the vault's .obsidian/plugin-backups. Packaging uses allowlisted code/resources and tests an extracted Skill in a fresh vault. No private catalog or source poster enters release bundles.

中文：Skill 调用标准库 CLI，预检后以恢复日志和原子写入生成资料；Obsidian 插件读取笔记属性，通过原版导航栈呈现合集和季。观看及评分只更新相应属性。插件升级备份旧文件，打包只允许必要资源，并验证解压后的新库安装。
