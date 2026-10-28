# Contributing / 参与贡献

Thanks for helping build a reliable, bilingual Obsidian media-library tool. / 欢迎为这个中英双语开源影音库项目贡献代码和文档。

1. Open an issue describing the bug or proposal. / 先创建 Issue 描述问题或需求。
2. Keep changes small and include tests for behavioral changes. / 改动尽量聚焦，并为行为变动补充测试。
3. Run the Python and Node tests, and check release packages when changing distributable code. / 修改行为后运行 Python、Node 测试；修改打包逻辑时验证安装包：

   ```bash
   python -m unittest discover -s tests -v
   python -m compileall -q scripts
   node --check plugin/main.js
   node --test tests/*.cjs
   python scripts/build_release.py
   ```

   `build_release.py` may regenerate `release/` files; inspect the diff and never silently replace published assets. / 打包脚本可能更新本地 `release/` 文件，请核对差异，勿改写旧 Release 附件。
4. Keep English and Chinese documentation aligned. / 重要功能需同步更新中英文文档。
5. Never attach a real private library, proprietary plugin source, copyrighted artwork/media or credentials without rights. / 未经授权不得提交私人目录、闭源插件、影视资源、海报和密钥。
6. Clearly distinguish implemented, untested and planned work. / 必须区分已实现、未测试与计划功能。

See [FAQ / 常见问题](docs/FAQ.md) before filing. For UI changes, attach genuine environment evidence (Obsidian version, OS, plugin version) and state NOT RUN for untested devices. / UI 修改请附真实运行证据并标注未测试平台。

Pull requests are welcome, subject to maintainer review. / 欢迎提交 PR，合并需经维护者审核。