# Release guide / 发布指南

0.3.0 is a preview, never stable 1.0. Use numeric tag **`0.3.0`**, exactly matching root/plugin manifests, when distributing the Obsidian plugin. The `v` in asset filenames is only a filename convention. Community directory listing requires a separate submission; a GitHub pre-release does not provide listing approval.

Official requirements: [Obsidian plugin submission](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin), [manifest](https://docs.obsidian.md/Reference/Manifest), [versions](https://docs.obsidian.md/Reference/Versions). Attach **main.js**, **manifest.json**, **styles.css** separately, plus both packages and SHA256SUMS.txt. Root manifest is kept synchronized with plugin/manifest.json.

Run Python tests, Node contracts, actual app acceptance, and `python scripts/build_release.py`. Inspect the two extracted packages and verify SHA-256. Commit only reviewed source, docs, screenshots, public examples and release files. Read back the remote commit before publishing. Use the exact tested commit for the release; mark it **Pre-release**. If the available tools cannot create/upload a release, the ready assets are in `release/` and bilingual notes in `docs/RELEASE-NOTES-v0.3.0.md`.

中文：标签使用纯数字 `0.3.0`，与两个 manifest 一致；附件名称中的 v 不属于标签。需上传插件三个独立文件、Skill、ZIP 和校验和，并明确勾选预发布。先远端回读提交，再按同一提交发布。插件商店另行审核，不能用预发布冒充稳定版。
