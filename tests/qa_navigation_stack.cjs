const assert = require("assert");
const Module = require("module");
const path = require("path");

global.window = {
  requestAnimationFrame(callback) { callback(); return 1; },
  clearTimeout() {},
  setTimeout(callback) { callback(); return 1; },
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

const pluginModule = require(path.resolve(__dirname, "../plugin/main.js"));
const { MovieWallNavigation } = pluginModule.__test;

const restored = [];
const library = {
  captureNavigationState() {
    return {
      type: "library",
      scrollTop: 18940,
      mediaFilter: "tv",
      watchFilter: "unwatched",
      searchQuery: "爱，死亡和机器人",
    };
  },
  restoreNavigationState(state) { restored.push(["library", state]); },
};
const collection = {
  captureNavigationState() { return { type: "collection", id: "harry-potter", scrollTop: 1320 }; },
  restoreNavigationState(state) { restored.push(["collection", state]); },
};

function fakeModal(name, navigation) {
  return {
    name,
    opened: false,
    closed: false,
    open() { this.opened = true; },
    close() { this.closed = true; navigation.modalClosed(this); },
  };
}

const navigation = new MovieWallNavigation({ app: {} });
const collectionModal = fakeModal("collection", navigation);
navigation.push("collection", "harry-potter", collectionModal, library);
assert.strictEqual(navigation.stack.length, 1);
assert.strictEqual(collectionModal.opened, true);

const movieModal = fakeModal("movie", navigation);
navigation.push("movie", "harry-potter-5", movieModal, collection);
assert.deepStrictEqual(navigation.stack.map((frame) => frame.type), ["collection", "movie"]);

// Android back / close acts on the top modal: movie -> collection.
movieModal.close();
assert.deepStrictEqual(navigation.stack.map((frame) => frame.type), ["collection"]);
assert.deepStrictEqual(restored[0], ["collection", { type: "collection", id: "harry-potter", scrollTop: 1320 }]);

// A second back closes the collection and restores the exact library state.
collectionModal.close();
assert.strictEqual(navigation.stack.length, 0);
assert.deepStrictEqual(restored[1], ["library", {
  type: "library",
  scrollTop: 18940,
  mediaFilter: "tv",
  watchFilter: "unwatched",
  searchQuery: "爱，死亡和机器人",
}]);

console.log(JSON.stringify({
  passed: true,
  tests: {
    collection_to_movie_back_to_collection: true,
    collection_scroll_restored: restored[0][1].scrollTop === 1320,
    second_back_to_library: true,
    library_scroll_restored: restored[1][1].scrollTop === 18940,
    filters_and_search_restored:
      restored[1][1].mediaFilter === "tv" &&
      restored[1][1].watchFilter === "unwatched" &&
      restored[1][1].searchQuery === "爱，死亡和机器人",
  },
}, null, 2));
