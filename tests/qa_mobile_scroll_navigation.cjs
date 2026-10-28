const assert = require("assert");
const fs = require("fs");
const Module = require("module");
const path = require("path");

let nextFrame = 1;
const frameQueue = [];

global.window = {
  requestAnimationFrame(callback) {
    frameQueue.push(callback);
    return nextFrame++;
  },
  cancelAnimationFrame() {},
  clearTimeout() {},
  setTimeout(callback) { callback(); return 1; },
  matchMedia() { return { matches: true }; },
};

global.document = {
  body: { classList: { contains(name) { return name === "is-mobile"; } } },
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "obsidian") {
    return {
      ItemView: class {},
      Modal: class {},
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
const { MovieWallView } = pluginModule.__test;

class FakeClassList {
  constructor(names = []) {
    this.names = new Set(names);
    this.mutations = 0;
  }
  contains(name) { return this.names.has(name); }
  toggle(name, force) {
    const before = this.names.has(name);
    const after = force === undefined ? !before : Boolean(force);
    if (before !== after) {
      this.mutations += 1;
      if (after) this.names.add(name);
      else this.names.delete(name);
    }
    return after;
  }
}

function fakeElement(classes = []) {
  return {
    classList: new FakeClassList(classes),
    attributes: {},
    disabled: false,
    hidden: false,
    setAttribute(name, value) { this.attributes[name] = String(value); },
  };
}

const compact = fakeElement();
const compactTop = fakeElement();
const floatingTop = fakeElement();
const sentinel = {
  isConnected: true,
  offsetTop: 180,
  getBoundingClientRect() { return { bottom: -1 }; },
};
const scroller = {
  scrollTop: 0,
  clientHeight: 700,
  getBoundingClientRect() { return { top: 0 }; },
  scrollTo(options) { this.lastScroll = options; },
};
const elements = new Map([
  [".movie-wall-header-sentinel", sentinel],
  [".movie-wall-compact-shell", compact],
  [".movie-wall-compact-top", compactTop],
  [".movie-wall-back-to-top", floatingTop],
]);

const observers = [];
window.IntersectionObserver = class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = null;
    this.disconnected = false;
    observers.push(this);
  }
  observe(target) { this.observed = target; }
  disconnect() { this.disconnected = true; }
};

const view = Object.create(MovieWallView.prototype);
Object.assign(view, {
  compactVisible: false,
  compactSearchOpen: false,
  headerObserver: null,
  scrollUiFrame: null,
  containerEl: { querySelector(selector) { return elements.get(selector) || null; } },
  scrollElement() { return scroller; },
  render() { throw new Error("滚动 UI 不应触发 render()"); },
  loadItems() { throw new Error("滚动 UI 不应触发 loadItems()"); },
});

view.setupScrollNavigation();
assert.strictEqual(observers.length, 1);
const observer = observers[0];
assert.strictEqual(observer.options.root, scroller);
assert.strictEqual(observer.options.threshold, 0);
assert.strictEqual(observer.observed, sentinel);

observer.callback([{
  target: sentinel,
  isIntersecting: true,
  boundingClientRect: { bottom: 120 },
  rootBounds: { top: 0 },
}]);
assert.strictEqual(view.compactVisible, false);

scroller.scrollTop = 240;
observer.callback([{
  target: sentinel,
  isIntersecting: false,
  boundingClientRect: { bottom: -1 },
  rootBounds: { top: 0 },
}]);
assert.strictEqual(view.compactVisible, true);
assert.strictEqual(compact.classList.contains("is-visible"), true);
const firstShowMutations = compact.classList.mutations;

for (let index = 0; index < 20; index += 1) {
  observer.callback([{
    target: sentinel,
    isIntersecting: false,
    boundingClientRect: { bottom: -1 },
    rootBounds: { top: 0 },
  }]);
}
assert.strictEqual(compact.classList.mutations, firstShowMutations);

scroller.scrollTop = 1600;
view.updateScrollUi();
assert.strictEqual(compactTop.disabled, false);
assert.strictEqual(compactTop.classList.contains("is-enabled"), true);
assert.strictEqual(floatingTop.hidden, true);

view.scrollToTop();
assert.deepStrictEqual(scroller.lastScroll, { top: 0, behavior: "smooth" });

scroller.scrollTop = 0;
observer.callback([{
  target: sentinel,
  isIntersecting: true,
  boundingClientRect: { bottom: 120 },
  rootBounds: { top: 0 },
}]);
assert.strictEqual(view.compactVisible, false);
assert.strictEqual(compact.classList.contains("is-visible"), false);

while (frameQueue.length) frameQueue.shift()();
let updates = 0;
view.updateScrollUi = () => { updates += 1; };
for (let index = 0; index < 50; index += 1) view.scheduleScrollUiUpdate();
assert.strictEqual(frameQueue.length, 1);
frameQueue.shift()();
assert.strictEqual(updates, 1);

const pluginSource = fs.readFileSync(pluginPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const scrollUiSource = [
  MovieWallView.prototype.setCompactVisible,
  MovieWallView.prototype.setupScrollNavigation,
  MovieWallView.prototype.scheduleScrollUiUpdate,
  MovieWallView.prototype.updateScrollUi,
].map((method) => method.toString()).join("\n");
assert(!scrollUiSource.includes("this.render("));
assert(!scrollUiSource.includes("this.loadItems("));
assert(!pluginSource.includes("lastScrollTop"));
assert(!pluginSource.includes("handleScroll"));
assert(pluginSource.includes("movie-wall-full-header"));
assert(pluginSource.includes("movie-wall-compact-shell"));
assert(pluginSource.includes("movie-wall-compact-header"));
assert(pluginSource.includes("createFilterControls(allItems, movieCount, tvCount"));
assert(css.includes(".movie-wall-header {\n  position: static;"));
assert(css.includes(".movie-wall-compact-shell {\n  position: sticky;"));
assert(css.includes("top: 0;"));
assert(css.includes("height: var(--mw-compact-height);\n  margin: 0 0 calc(0px - var(--mw-compact-height));"));
assert(css.includes("transform: none;\n  filter: none;\n  perspective: none;"));
assert(css.includes(".is-mobile .movie-wall-root {\n  padding: 0 0 48px;"));
assert(css.includes("padding: 6px max(8px, env(safe-area-inset-right)) 6px max(8px, env(safe-area-inset-left));"));
assert(css.includes(".movie-wall-compact-search-panel {\n  position: absolute;"));
assert(css.includes(".is-mobile .movie-wall-back-to-top { display: none !important; }"));
const compactHeaderCss = css.slice(
  css.indexOf(".movie-wall-compact-header {"),
  css.indexOf(".movie-wall-compact-header .movie-wall-filter-controls"),
);
assert(compactHeaderCss.includes("background: inherit;"));
assert(compactHeaderCss.includes("backdrop-filter: none;"));
assert(compactHeaderCss.includes("transform: none;"));
assert(!compactHeaderCss.includes("translate"));
assert(!compactHeaderCss.includes("blur("));
assert(!compactHeaderCss.includes("perspective"));

console.log(JSON.stringify({
  passed: true,
  tests: {
    full_and_compact_headers_are_separate: true,
    intersection_observer_uses_sentinel: true,
    repeated_observer_state_does_not_mutate_dom: true,
    scroll_events_are_raf_throttled: true,
    scroll_ui_does_not_render_or_load_items: true,
    shared_media_and_watch_filter_state: true,
    compact_search_is_overlay: true,
    deep_scroll_enables_header_top_button: true,
    mobile_floating_button_is_hidden: true,
    compact_header_avoids_android_webview_effects: true,
    sticky_shell_uses_scroll_viewport_top_zero: true,
    scroll_container_has_no_top_padding: true,
    side_safe_area_padding_is_applied: true,
  },
}, null, 2));
