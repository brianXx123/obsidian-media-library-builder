# Validation 0.3.0 / 验证报告

Date: **2026-10-28 (Asia/Bangkok)**. Preview version 0.3.0, based on the author's located Movie Wall 1.5.0. Evidence below distinguishes automated checks, actual application tests and supplied historical footage.

## Actual Obsidian Desktop — PASS

Windows, installed Obsidian **1.14.5**, plugin **0.3.0**, a separate application profile and freshly generated **Demo Vault Verified**. The original personal vault was read-only and was not modified. Captures use the actual Obsidian renderer through its local CDP interface, 1920×1080; these are not an HTML imitation. No image compositing, invented controls, poster overlays or nonuniform scaling was used.

Verified: 24 entries; 22 movie/2 series category controls; title search and a no-result search; Classic genre filtering; sorting; real local poster loading and missing-image fallback; Metropolis detail; Open note; keyboard Enter opening a card; light and dark themes. Watched=true and personal_rating=8 were read back from Obsidian metadata, then reset. The note body and imported metadata remained intact. A transient metadata-cache refresh immediately after a write required waiting before readback; settled readback passed.

Seven desktop screenshots are in [the capture manifest](screenshots/metadata.json), including all six requested scenarios and the light theme.

## Actual Obsidian Mobile — PASS (emulator)

Official **Obsidian Mobile 1.14.4** APK SHA-256: `b3e5bfa107bb01c4c121d810622ff2de03fd298f55fcf6268b9db50186f192a3`, verified against the official GitHub release asset digest before install. **Android 16, API 36, x86_64**, temporary read-only AVD; no connected real phone was modified. Native ADB screen captures retain the original **720×1600** portrait pixels.

Verified: same generated 24-work demo, local posters, no horizontal overflow, native touch scrolling, native touch opening Metropolis, detail and note jump, movie/TV and watched filtering. A native touch set Metropolis watched; after disabling/re-enabling the actual plugin, watched remained true and the watched filter returned one work. Season 1 of Breaking Bad was marked through its actual UI; after plugin reload, watchedSeasonKeys contained S1 and overall completion was false. Open note changed the actual active leaf to Markdown. The three requested mobile captures are included.

Native testing caught excessive mobile toolbar height after new filter controls were added. Fixed by using bounded 36px controls in a two-column toolbar; actual computed heights and screenshots were rechecked. Initial emulator startup had Digital Wellbeing/System UI ANRs; after dismissing those emulator dialogs the actual Obsidian run completed. Screenshots taken during onboarding, tooltips or incomplete repaints were retained locally and excluded from the public gallery.

## Supplied real-device recording — REVIEWED (original build)

The author supplied a 31.62-second **1080×2340** recording named `Screen_Recording_20260814_222152_Obsidian.mp4` and identified it as real-device testing. Six native frames were extracted at 1, 5, 10, 15.81, 20 and 25.30 seconds with no transformations. Visual review confirms original Movie Wall posters, scroll/navigation controls, TV category and season dialog. Its Obsidian/plugin versions are **not visible/confirmed**. This is historical original-build evidence, not a test of version 0.3.0. The raw recording and frames remain local because they show personal watched flags and third-party posters without supplied display-license evidence. They are not in the source or either release package.

## Automated checks — PASS

| Check | Actual result |
|---|---|
| Python standard-library tests | 20 tests PASS on Python 3.12.14 / Windows |
| JavaScript syntax and plugin contracts | 8 Node test entries PASS on Node 24.22.1; includes adapted original season, navigation, scroll and deletion harnesses |
| UTF-8 Skill frontmatter and structure | Official quick_validate.py PASS with workspace-local PyYAML and UTF-8 mode |
| Fresh vault / repeat import | 24 created, repeat 0 new, catalog+notes validation PASS |
| Independent CSV/JSON fixture | Quoted commas/newlines, Chinese and Unicode; CLI dry-run/import/validate PASS |
| Note conflict / unknown catalog / changed ID | Rejected before overwriting protected content |
| Write failure | Injected disk failure rolled back; clean retry PASS |
| Plugin installation/upgrade | Repeat install PASS; changed files rejected; explicit upgrade retained backup and data.json |
| Deletion and navigation | Contract tests verify tombstones, shared posters, trash rollback and parent-scroll restoration; native deletion itself NOT RUN |
| Release packages | Extracted Skill dry-run/import/repeat/validate/install PASS; ZIP names and per-file bytes match; SHA-256 verified |
| GitHub Actions | Separate Windows/Linux Python 3.10/3.13 jobs; live remote runs must be read back for the submitted commit; publication workflow waits for successful push CI |

The intentional `simulated recycle-bin failure` message in the deletion harness is the tested error path, not an unhandled test failure. Mocked API checks are not represented as native application tests.

The first remote CI run passed functional/package-install tests but failed exact package reproduction across Windows/Linux. ZIP platform defaults and compression were not fully normalized. The builder now sets fixed Unix ZIP metadata and uses ZIP_STORED to avoid compression-library variation; the exact-byte rebuild check remains mandatory on every matrix runner. The failed run is retained as evidence: [40653823405](https://github.com/brianXx123/obsidian-media-library-builder/actions/runs/40653823405). The corrected commit must pass complete CI before publication. / 首次远端 CI 发现跨平台 ZIP 字节差异，功能与安装测试通过；已固定 ZIP 平台元数据并使用无压缩存储，保留逐字节复核，失败记录不隐藏。

Real desktop timing on this machine: 5,000 records filtered in **6.1 ms**; 1,000 actual card DOM nodes built in **119.5 ms**. This measures filtering and synchronous DOM construction, not total image decode, scrolling latency or a guarantee for other hardware. Full grid virtualization remains future work.

## Privacy, artwork and remaining limits

The original three source files were copied read-only. No private catalog, API key, user-state file, original poster source or video enters GitHub or packages. All 16 public demo poster sources were checked individually as public domain on Commons; source bytes stay in the local demo. Eight titles use real placeholders. A broad search returned a modern AI-generated Nosferatu poster; review rejected it before public demo creation. Artwork lookup HTTP 429 was handled with a later serial pass that stopped on further rate limiting.

Windows capture helper initially failed twice (`FrameArrived timed out` / `window capture timed out`); final desktop evidence came from a separate real Obsidian profile via CDP. Skill validation initially lacked PyYAML and used GBK; installing the dependency locally and enabling UTF-8 resolved it. The supplied video path temporarily disappeared; after the author restored it, a working copy was extracted successfully.

**NOT RUN / not claimed:** macOS native UI, Linux native UI, iOS, current 0.3.0 on a physical Android phone, screen-reader audit, actual destructive native delete/rollback, full private-vault migration, full advanced-season import, complete UI translation, community-directory review. No separate personal CSV was provided by the author for this session; independent synthetic inputs and the public demo exercised the import pipeline. Do not present this preview as stable 1.0 or full parity with every private enrichment script.

中文：桌面及 Android 模拟器真实验收通过，独立于自动化契约测试。原版真机录像已提取原始帧并审阅，版本不可确认，不冒充新版真机测试。公开图集来自隔离 Demo，私人观看标记及未确认授权的录像海报留在本地。未测试系统及高级功能如上明确列出；当前版本仅预发布。
