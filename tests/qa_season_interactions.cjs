const assert = require("assert");
const fs = require("fs");
const Module = require("module");
const path = require("path");

global.window = {
  requestAnimationFrame(callback) { callback(); return 1; },
  cancelAnimationFrame() {},
  setTimeout(callback) { callback(); return 1; },
  clearTimeout() {},
  matchMedia() { return { matches: false }; },
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "obsidian") {
    return {
      ItemView: class {},
      Modal: class { close() {} },
      Notice: class {},
      Plugin: class {},
      TFile: class {},
      setIcon() {},
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const pluginPath = path.resolve(__dirname, "../plugin/main.js");
const cssPath = path.resolve(__dirname, "../plugin/styles.css");
const pluginModule = require(pluginPath);
const {
  MovieWallNavigation,
  MovieWallView,
  normalizeSeasonWatchKey,
  seasonWatchKey,
  seasonWatchKeys,
} = pluginModule.__test;

function season(number, part = 0) {
  return {
    season: number,
    part: part || undefined,
    label: part ? `第${number}季 Part ${part}` : `第${number}季`,
    original_label: part ? `Season ${number} Part ${part}` : `Season ${number}`,
    episodes: 8,
    year: 2024,
    air_date: "2024-01-01",
    status: "released",
    poster: `S${number}.webp`,
  };
}

function tvItem(title, seasons, watched = false, watchedValues = []) {
  return {
    title,
    mediaType: "电视剧",
    file: { path: `Media Library/Movies/${title}.md` },
    seasons,
    releasedSeasons: [...new Set(seasons.map((row) => row.season))],
    releasedSeasonCount: new Set(seasons.map((row) => row.season)).size,
    specials: [],
    watched,
    watchedSeasons: [...watchedValues],
    watchedSeasonKeys: seasonWatchKeys(watchedValues),
    collectionId: "",
  };
}

const frontmatter = new Map();
let notifications = 0;
const view = Object.create(MovieWallView.prototype);
Object.assign(view, {
  plugin: {
    async updateFrontMatter(file, update) { update(frontmatter.get(file.path)); },
    navigation: { notifyItemChanged() { notifications += 1; } },
  },
  syncItemWatchedUi() {},
});

assert.strictEqual(normalizeSeasonWatchKey(1), "S1");
assert.strictEqual(normalizeSeasonWatchKey("02"), "S2");
assert.strictEqual(normalizeSeasonWatchKey("S03P01"), "S3P1");
assert.strictEqual(normalizeSeasonWatchKey("SPECIAL02"), "SP2");
assert.strictEqual(seasonWatchKey(season(3, 1)), "S3P1");
assert.strictEqual(seasonWatchKey(season(3, 2)), "S3P2");
assert.strictEqual(seasonWatchKey({ label: "Specials" }, true, 0), "SP1");

const love = tvItem("爱，死亡和机器人", [season(1), season(2), season(3), season(4)]);
frontmatter.set(love.file.path, {
  watched: false,
  watched_seasons: [],
  watch_date: "2026-01-02",
  personal_rating: 9,
  notes: "私人笔记",
  custom_field: "必须保留",
});
const protectedBefore = { ...frontmatter.get(love.file.path) };

(async () => {
  for (let index = 0; index < 4; index += 1) {
    const changed = await view.toggleSeasonWatched(love, love.seasons[index]);
    assert.strictEqual(changed, true);
    const stats = view.seasonStats(love);
    assert.strictEqual(stats.watched, index + 1);
    assert.strictEqual(stats.total, 4);
    assert.strictEqual(love.watched, index === 3);
  }
  assert.deepStrictEqual(frontmatter.get(love.file.path).watched_seasons, ["S1", "S2", "S3", "S4"]);
  assert.strictEqual(frontmatter.get(love.file.path).watched, true);

  await view.toggleSeasonWatched(love, love.seasons[1]);
  assert.deepStrictEqual(frontmatter.get(love.file.path).watched_seasons, ["S1", "S3", "S4"]);
  assert.strictEqual(view.seasonStats(love).watched, 3);
  assert.strictEqual(love.watched, false);
  for (const key of ["watch_date", "personal_rating", "notes", "custom_field"]) {
    assert.deepStrictEqual(frontmatter.get(love.file.path)[key], protectedBefore[key]);
  }

  await view.toggleWatched(love);
  assert.strictEqual(love.watched, true);
  assert.deepStrictEqual(love.watchedSeasons, ["S1", "S2", "S3", "S4"]);
  await view.toggleWatched(love);
  assert.strictEqual(love.watched, false);
  assert.deepStrictEqual(love.watchedSeasons, []);

  const parts = tvItem("Part 测试", [season(1), season(3, 1), season(3, 2)]);
  frontmatter.set(parts.file.path, { watched: false, watched_seasons: [], watch_date: "", personal_rating: "", notes: "Part notes" });
  await view.toggleSeasonWatched(parts, parts.seasons[1]);
  await view.toggleSeasonWatched(parts, parts.seasons[2]);
  assert.deepStrictEqual(parts.watchedSeasons, ["S3P1", "S3P2"]);
  assert.strictEqual(view.seasonStats(parts).total, 3);
  assert.strictEqual(parts.watched, false);

  const legacy = tvItem("旧版已看剧", [season(1), season(2), season(3), season(4)], true, []);
  frontmatter.set(legacy.file.path, { watched: true, watched_seasons: [], watch_date: "", personal_rating: "", notes: "legacy" });
  assert.strictEqual(view.seasonStats(legacy).watched, 4);
  await view.toggleSeasonWatched(legacy, legacy.seasons[1]);
  assert.deepStrictEqual(legacy.watchedSeasons, ["S1", "S3", "S4"]);
  assert.strictEqual(legacy.watched, false);

  const specialItem = tvItem("Special 测试", [season(1)], true, [1]);
  const special = { label: "特别篇", status: "released", episodes: 1 };
  frontmatter.set(specialItem.file.path, { watched: true, watched_seasons: [1], watch_date: "", personal_rating: "", notes: "special" });
  await view.toggleSeasonWatched(specialItem, special, true, 0);
  assert.deepStrictEqual(specialItem.watchedSeasons, ["S1", "SP1"]);
  assert.strictEqual(view.seasonStats(specialItem).total, 1);
  assert.strictEqual(specialItem.watched, true);

  const ova = tvItem("纯 OVA", [], true, []);
  frontmatter.set(ova.file.path, { watched: true, watched_seasons: [], watch_date: "", personal_rating: "", notes: "ova" });
  await view.toggleSeasonWatched(ova, special, true, 0);
  assert.deepStrictEqual(ova.watchedSeasons, ["SP1"]);
  assert.strictEqual(ova.watched, true);

  const future = tvItem("未来新增季", [season(1), season(2), season(3), season(4), season(5)], true, ["S1", "S2", "S3", "S4"]);
  assert.strictEqual(view.seasonStats(future).completed, false);

  const restored = [];
  const navigation = new MovieWallNavigation({ app: {} });
  const library = {
    captureNavigationState() { return { type: "library", scrollTop: 18800 }; },
    restoreNavigationState(state) { restored.push(["library", state]); },
  };
  function fakeModal(name, parentScroll) {
    return {
      name,
      opened: false,
      open() { this.opened = true; },
      close() { navigation.modalClosed(this); },
      captureNavigationState() { return { type: name, scrollTop: parentScroll }; },
      restoreNavigationState(state) { restored.push([name, state]); },
    };
  }
  const tv = fakeModal("tv", 3840);
  navigation.push("tv", "love-death-robots", tv, library);
  const detail = fakeModal("season", 0);
  navigation.push("season", "love-death-robots#S3", detail, tv);
  detail.close();
  assert.deepStrictEqual(restored[0], ["tv", { type: "tv", scrollTop: 3840 }]);
  tv.close();
  assert.deepStrictEqual(restored[1], ["library", { type: "library", scrollTop: 18800 }]);

  const pluginSource = fs.readFileSync(pluginPath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");
  const watchMethods = `${MovieWallView.prototype.toggleWatched}\n${MovieWallView.prototype.toggleSeasonWatched}`;
  assert(!watchMethods.includes("this.render("));
  assert(pluginSource.includes("event.stopPropagation()"));
  assert(pluginSource.includes("class SeasonDetailModal"));
  assert(pluginSource.includes("movie-wall-season-detail-poster"));
  assert(pluginSource.includes("this.contentEl.scrollTop = scrollTop"));
  assert(pluginSource.includes("class MovieWallModal extends Modal"));
  assert(css.includes("cubic-bezier(.22,1,.36,1)"));
  assert(css.includes(".movie-wall-modal-layer.is-closing"));
  assert(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert(css.includes(".movie-wall-season-watched.is-watched"));
  assert.strictEqual(notifications, 12);

  console.log(JSON.stringify({
    passed: true,
    tests: {
      numeric_watched_seasons_compatible: true,
      regular_season_keys: ["S1", "S2"],
      part_keys_are_unique: ["S3P1", "S3P2"],
      specials_excluded_from_tv_completion: true,
      season_progress_0_to_4_and_back_to_3: true,
      tv_watched_auto_linked: true,
      legacy_watched_true_is_compatible: true,
      future_new_season_cancels_completion: true,
      season_button_stops_card_click: true,
      season_detail_exists: true,
      season_to_tv_to_library_stack: true,
      tv_scroll_position_restored: true,
      state_changes_do_not_render_wall: true,
      personal_fields_preserved: true,
      unified_modal_motion_present: true,
    },
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 2;
});
