const assert = require("assert");
const Module = require("module");
const path = require("path");

class TFile {
  constructor(filePath) { this.path = filePath; }
}
class Plugin {}
class ItemView {}
class Modal {}
class Notice { constructor(message) { Notice.messages.push(message); } }
Notice.messages = [];

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "obsidian") return { ItemView, Modal, Notice, Plugin, TFile, setIcon() {} };
  return originalLoad.call(this, request, parent, isMain);
};
const MovieWallPlugin = require(path.resolve(__dirname, "../plugin/main.js"));
Module._load = originalLoad;

function raw(title, file, poster, imdb) {
  return {
    type: "影视", title, original_title: title, english_title: "", aliases: [], year: 2020,
    imdb_id: imdb, tmdb_id: "", media_type: "电影", file, poster, poster_status: "ok",
    collection_id: "", netflix: false, netflix_status: "not_available", certification_zh: "PG-13",
  };
}

function ui(row) {
  return {
    title: row.title, originalTitle: row.original_title, englishTitle: row.english_title,
    aliases: row.aliases, year: String(row.year), imdbId: row.imdb_id, tmdbId: row.tmdb_id,
    file: new TFile(row.file), poster: row.poster, seasons: [], specials: [], upcomingSeasons: [],
  };
}

function makePlugin({ failTrash = false } = {}) {
  const first = raw("测试片 A", "Media Library/Movies/测试片 A.md", "Media Library/posters/测试片 A.webp", "tt9000001");
  const second = raw("测试片 B", "Media Library/Movies/测试片 B.md", "Media Library/posters/共享.webp", "tt9000002");
  const third = raw("测试片 C", "Media Library/Movies/测试片 C.md", "Media Library/posters/共享.webp", "tt9000003");
  const data = {
    "Media Library/catalog.json": { source_count: 3, counts: {}, items: [first, second, third] },
    "Media Library/collections.json": { collections: [] },
    "Media Library/deleted-items.json": { schema_version: 1, items: [] },
  };
  const files = new Map();
  for (const row of [first, second, third]) files.set(row.file, new TFile(row.file));
  for (const poster of [first.poster, second.poster]) files.set(poster, new TFile(poster));
  for (const jsonPath of Object.keys(data)) files.set(jsonPath, new TFile(jsonPath));
  const trashed = [];
  const plugin = new MovieWallPlugin();
  plugin.internalWrites = new Set();
  plugin.readJson = async (jsonPath, fallback) => data[jsonPath] || fallback;
  plugin.writeVaultText = async (jsonPath, value) => { data[jsonPath] = JSON.parse(value); };
  plugin.capturePaths = async () => new Map([["snapshot", { exists: true }]]);
  plugin.restoreSnapshots = async () => { plugin.didRollback = true; };
  plugin.syncCollectionMemberFiles = async () => {};
  plugin.collectionFile = () => null;
  plugin.app = {
    vault: {
      getAbstractFileByPath(filePath) { return files.get(filePath) || null; },
    },
    fileManager: {
      async trashFile(file) {
        trashed.push(file.path);
        if (failTrash) throw new Error("simulated recycle-bin failure");
      },
    },
  };
  return { plugin, data, trashed, first, second, third };
}

(async () => {
  const success = makePlugin();
  const result = await success.plugin.deleteItems([ui(success.first), ui(success.second)]);
  assert.deepStrictEqual(new Set(result.deletedPaths), new Set([success.first.file, success.second.file]));
  assert.strictEqual(success.data["Media Library/catalog.json"].items.length, 1);
  assert.strictEqual(success.data["Media Library/deleted-items.json"].items.length, 2);
  assert(success.trashed.includes(success.first.file));
  assert(success.trashed.includes(success.second.file));
  assert(success.trashed.includes(success.first.poster), "unreferenced poster must be trashed");
  assert(!success.trashed.includes(success.second.poster), "shared poster must be retained");

  const collection = makePlugin();
  collection.first.collection_id = "test-pack";
  collection.first.collection_name = "测试合集";
  collection.first.collection_order = 1;
  collection.second.collection_id = "test-pack";
  collection.second.collection_name = "测试合集";
  collection.second.collection_order = 2;
  collection.data["Media Library/collections.json"].collections = [{ collection_id: "test-pack", count: 2 }];
  const collectionFile = new TFile("Media Library/Collections/测试合集.md");
  collection.plugin.collectionFile = () => collectionFile;
  await collection.plugin.deleteItems([ui(collection.first)]);
  const survivor = collection.data["Media Library/catalog.json"].items.find((item) => item.title === "测试片 B");
  assert.strictEqual(survivor.collection_id, "", "one-member collection must dissolve");
  assert.strictEqual(collection.data["Media Library/collections.json"].collections.length, 0);
  assert(collection.trashed.includes(collectionFile.path), "dissolved collection note must be trashed");

  const rollback = makePlugin({ failTrash: true });
  await assert.rejects(() => rollback.plugin.deleteItems([ui(rollback.first)]));
  assert.strictEqual(rollback.plugin.didRollback, true, "failed trash must restore snapshots");
  assert(Notice.messages.some((message) => message.includes("已回滚")));

  const source = require("fs").readFileSync(path.resolve(__dirname, "../plugin/main.js"), "utf8");
  assert(source.includes("app.fileManager.trashFile"));
  assert(!source.includes("app.vault.delete("));
  assert(source.includes("LONG_PRESS_MS = 500"));
  assert(source.includes("LONG_PRESS_MOVE_PX = 10"));
  console.log(JSON.stringify({ passed: true, trash_calls: success.trashed, singleton_collection_dissolved: true, rollback_verified: true }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
