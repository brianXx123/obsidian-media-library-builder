# Testing / 测试

The executed 0.3.1 results, exact versions, actual app evidence and NOT RUN items are in [VALIDATION-v0.3.1.md](VALIDATION-v0.3.1.md). Capture metadata includes every screenshot's environment, scenario and hash. Node contract tests are distinct from native tests.

Run `python -m unittest discover -s tests -v`, `node --check plugin/main.js`, `node --test tests/*.cjs`, then `python scripts/build_release.py`. GitHub CI runs Python 3.10/3.13 on Windows and Linux with Node 22. Read back the exact remote commit's run before claiming CI PASS.

For native regression checks, generate an isolated demo using create_demo.py, enable only this plugin, verify search/category/genre/sort/detail/note actions, toggle watched and one TV season, reload the plugin and verify notes. Test missing images, both themes, keyboard and touch scrolling. Never use a private vault for published demonstration captures. Native deletion/rollback needs a separate disposable test with a backup.

中文：实际执行结果以版本验收报告为准；自动化测试与真实应用测试分别记录。升级前关闭 Obsidian，已有库先备份。公开截图使用隔离 Demo，未测试项目必须标 NOT RUN。
