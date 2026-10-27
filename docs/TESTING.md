# Verification matrix / 验收矩阵

| Test | Evidence method | Status |
| --- | --- | --- |
| Python CSV/JSON import & note generation | `python -m unittest discover -s tests -v` | Repository tests provided; CI to confirm |
| Python plugin installer safety | `tests/test_install.py` | Repository tests provided; CI to confirm |
| JavaScript plugin initialization, catalog validation, filters and watch-state persistence | `node --test tests/plugin.test.cjs` | Mocked Obsidian API contract tests; CI to confirm |
| Linux / Windows runners | GitHub Actions `.github/workflows/ci.yml` | Workflow committed; results require readback |
| Actual Obsidian desktop plugin UI | Real Obsidian desktop | NOT RUN |
| Real Obsidian Mobile | Real Obsidian Mobile | NOT RUN |
| Original Movie Wall parity | Original source + original vault/screenshots | BLOCKED: original not available |
| AI-generated promotional UI images | Not admissible as product evidence | EXCLUDED |

## Manual desktop/mobile checklist / 人工验收
1. Create and open an isolated test vault; install the three plugin files.
2. Manually enable the plugin and open the view.
3. Confirm catalog count, search, type/genre/status, rating/year sort, details and open-note action.
4. Supply vault-local image files and verify thumbnails; confirm missing poster fallback.
5. Toggle Watched, restart Obsidian and verify `user-state.json` persistence.
6. Reimport identical CSV, verify state and original notes remain unchanged.
7. Repeat on Obsidian Mobile, checking touch, narrow width, keyboard/screen reader focus.
8. Capture genuine screen evidence only after each real run. Do not use AI mockups as evidence.

The actual Obsidian app is not available in this development environment. Passing simulated Node contract tests is **not** proof of native rendering on Windows, Android or iOS.
