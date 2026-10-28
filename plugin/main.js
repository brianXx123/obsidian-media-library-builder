/* Original Movie Wall by brianXx123; public integration 0.3.0. MIT. */
const { ItemView, Modal, Notice, Plugin, TFile, setIcon } = require("obsidian");

const VIEW_TYPE = "media-library-wall";
const ENTRY_FOLDER = "Media Library/";
const CERTIFICATION_MAP_PATH = "Media Library/certification-map.json";
const CATALOG_PATH = "Media Library/catalog.json";
const COLLECTIONS_PATH = "Media Library/collections.json";
const DELETED_ITEMS_PATH = "Media Library/deleted-items.json";
const COLLECTION_FOLDER = "Media Library/Collections/";
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_PX = 10;
const MEDIA_FILTERS = new Set(["all", "movie", "tv"]);
const WATCH_FILTERS = ["all", "watched", "unwatched"];

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (value === null || value === undefined || value === "") return [];
  return [String(value)];
}

function asBool(value) {
  return value === true || value === "true";
}

function numberList(value) {
  return asList(value).map(Number).filter((item) => Number.isInteger(item) && item > 0);
}

function objectList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) return item;
    if (typeof item !== "string") return null;
    try {
      const parsed = JSON.parse(item);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (_) {
      return null;
    }
  }).filter(Boolean);
}

function asObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function text(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function stableItemKey(item) {
  return item?.file?.path || item?.file || `${text(item?.title)}#${text(item?.year)}`;
}

function catalogMatchesItem(raw, item) {
  const itemPath = stableItemKey(item);
  if (text(raw?.file) && text(raw.file) === itemPath) return true;
  for (const pair of [[raw?.imdb_id, item?.imdbId], [raw?.tmdb_id, item?.tmdbId]]) {
    if (text(pair[0]) && text(pair[1]) && text(pair[0]).toLowerCase() === text(pair[1]).toLowerCase()) return true;
  }
  return text(raw?.title) === text(item?.title) && text(raw?.year) === text(item?.year);
}

function posterPaths(item) {
  const paths = new Set();
  const add = (value) => {
    const path = text(value).replace(/^\/+/, "");
    if (path && !/^https?:\/\//i.test(path)) paths.add(path);
  };
  add(item?.poster);
  for (const row of [...objectList(item?.seasons), ...objectList(item?.specials), ...objectList(item?.upcoming_seasons)]) add(row.poster);
  return paths;
}

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined && content !== null) node.textContent = String(content);
  return node;
}

function afterLayout(callback) {
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
}

function normalizeSeasonWatchKey(value) {
  const raw = text(value).trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";
  const normal = raw.match(/^S?0*(\d+)(?:P0*(\d+))?$/);
  if (normal) return `S${Number(normal[1])}${normal[2] ? `P${Number(normal[2])}` : ""}`;
  const special = raw.match(/^(?:SP|SPECIAL)0*(\d+)$/);
  if (special) return `SP${Number(special[1])}`;
  return raw;
}

function seasonWatchKey(season, special = false, index = 0) {
  const explicit = normalizeSeasonWatchKey(season?.watch_key || season?.key);
  if (explicit) return explicit;
  if (special) return `SP${Number(season?.special || season?.number) || index + 1}`;
  const number = Number(season?.season);
  if (!Number.isInteger(number) || number < 1) return "";
  const part = Number(season?.part);
  return `S${number}${Number.isInteger(part) && part > 0 ? `P${part}` : ""}`;
}

function seasonWatchKeys(value) {
  return new Set(asList(value).map(normalizeSeasonWatchKey).filter(Boolean));
}

function sortedSeasonWatchKeys(keys) {
  return [...keys].sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
}

function isReleasedSeason(season) {
  return text(season?.status, "released") !== "upcoming";
}

class MovieWallNavigation {
  constructor(plugin) {
    this.plugin = plugin;
    this.stack = [];
  }

  openCollection(wall, collection) {
    const modal = new CollectionModal(this.plugin.app, this.plugin, collection, wall);
    return this.push("collection", collection.id, modal, wall);
  }

  openMovie(wall, item, parent = wall) {
    const modal = new MovieDetailModal(this.plugin.app, this.plugin, item, wall);
    return this.push(item.mediaType === "电影" ? "movie" : "tv", item.file?.path || item.title, modal, parent);
  }

  openSeason(wall, item, season, parent, options = {}) {
    const modal = new SeasonDetailModal(this.plugin.app, this.plugin, item, season, wall, parent, options);
    const key = seasonWatchKey(season, Boolean(options.special), Number(options.index) || 0);
    return this.push("season", `${item.file?.path || item.title}#${key}`, modal, parent);
  }

  push(type, id, modal, parent) {
    const frame = {
      type,
      id,
      modal,
      parent,
      parentState: typeof parent?.captureNavigationState === "function" ? parent.captureNavigationState() : null,
    };
    modal.navigationFrame = frame;
    this.stack.push(frame);
    modal.open();
    return modal;
  }

  modalClosed(modal) {
    const index = this.stack.findIndex((frame) => frame.modal === modal);
    if (index < 0) return;
    const [frame] = this.stack.splice(index, 1);
    if (typeof frame.parent?.restoreNavigationState !== "function") return;
    afterLayout(() => frame.parent.restoreNavigationState(frame.parentState));
  }

  notifyItemChanged(item) {
    for (const frame of this.stack) {
      if (typeof frame.modal?.syncItemState === "function") frame.modal.syncItemState(item);
    }
  }

  closeAll() {
    const frames = [...this.stack].reverse();
    this.stack.length = 0;
    for (const frame of frames) frame.modal.close(true);
  }
}

class MovieWallPlugin extends Plugin {
  async onload() {
    this.legacyStatuses = {};
    const statePath = "Media Library/user-state.json";
    if (await this.app.vault.adapter.exists(statePath)) {
      const state = JSON.parse(await this.app.vault.adapter.read(statePath));
      if (state.schema_version !== 1 || !state.statuses || Array.isArray(state.statuses)) throw new Error("Invalid legacy user-state.json; restore a valid backup before enabling");
      this.legacyStatuses = state.statuses;
    }
    const saved = await this.loadData();
    const mediaFilter = MEDIA_FILTERS.has(saved?.mediaFilter) ? saved.mediaFilter : "all";
    const watchFilter = WATCH_FILTERS.includes(saved?.watchFilter) ? saved.watchFilter : "all";
    this.settings = { ...(saved || {}), mediaFilter, watchFilter };
    this.settingsSave = Promise.resolve();
    this.internalWrites = new Set();
    this.navigation = new MovieWallNavigation(this);
    this.certificationMap = {};
    await this.loadCertificationMap();
    this.registerView(VIEW_TYPE, (leaf) => new MovieWallView(leaf, this));
    this.addRibbonIcon("clapperboard", "Open Media Library / 打开影视库", () => this.activateView());
    this.addCommand({ id: "open-movie-wall", name: "Open Media Library / 打开影视库", callback: () => this.activateView() });
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      if (this.internalWrites.delete(file.path)) return;
      if (file.path.startsWith(ENTRY_FOLDER)) this.refreshViews(true);
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (file.path.startsWith(ENTRY_FOLDER)) this.refreshViews(true);
    }));
    this.registerEvent(this.app.vault.on("modify", async (file) => {
      if (file.path !== CERTIFICATION_MAP_PATH) return;
      await this.loadCertificationMap();
      this.refreshViews();
    }));
  }

  async loadCertificationMap() {
    const file = this.app.vault.getAbstractFileByPath(CERTIFICATION_MAP_PATH);
    if (!(file instanceof TFile)) {
      this.certificationMap = {};
      return;
    }
    try {
      this.certificationMap = JSON.parse(await this.app.vault.cachedRead(file));
    } catch (_) {
      this.certificationMap = {};
    }
  }

  regionName(code) {
    const region = text(code).toUpperCase();
    const cached = this.certificationMap?.region_names?.[region];
    if (cached) return cached;
    try {
      return new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(region) || region;
    } catch (_) {
      return region;
    }
  }

  certificationMapping(region, original) {
    const ratings = this.certificationMap?.regions?.[text(region).toUpperCase()]?.ratings || {};
    const key = text(original).trim().toUpperCase().replace(/[–—]/g, "-").replace(/\s+/g, " ");
    return ratings[key] || null;
  }

  setMediaFilter(filter) {
    if (!MEDIA_FILTERS.has(filter) || filter === this.settings.mediaFilter) return;
    this.settings.mediaFilter = filter;
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (!leaf.view || typeof leaf.view.applyMediaFilter !== "function") continue;
      leaf.view.applyMediaFilter(filter);
    }
    this.saveSettings();
  }

  cycleWatchFilter() {
    const index = WATCH_FILTERS.indexOf(this.settings.watchFilter);
    this.setWatchFilter(WATCH_FILTERS[(index + 1) % WATCH_FILTERS.length]);
  }

  setWatchFilter(filter) {
    if (!WATCH_FILTERS.includes(filter) || filter === this.settings.watchFilter) return;
    this.settings.watchFilter = filter;
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (!leaf.view || typeof leaf.view.applyWatchFilter !== "function") continue;
      leaf.view.applyWatchFilter(filter);
    }
    this.saveSettings();
  }

  saveSettings() {
    const snapshot = { ...this.settings };
    this.settingsSave = this.settingsSave
      .then(() => this.saveData(snapshot))
      .catch((error) => console.error("Movie Wall: failed to save UI settings", error));
  }

  async updateFrontMatter(file, update) {
    this.internalWrites.add(file.path);
    try {
      let changed;
      await this.app.fileManager.processFrontMatter(file, (fm) => { update(fm); changed = fm; });
      if (changed?.id && Object.hasOwn(this.legacyStatuses, changed.id)) {
        this.legacyStatuses[changed.id] = changed.watched === true;
        await this.app.vault.adapter.write("Media Library/user-state.json", jsonText({schema_version: 1, statuses: this.legacyStatuses}));
      }
    } finally {
      window.setTimeout(() => this.internalWrites.delete(file.path), 2000);
    }
  }

  async readJson(path, fallback) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return fallback;
    try {
      return JSON.parse(await this.app.vault.cachedRead(file));
    } catch (_) {
      return fallback;
    }
  }

  async writeVaultText(path, value) {
    const file = this.app.vault.getAbstractFileByPath(path);
    this.internalWrites.add(path);
    if (file instanceof TFile) await this.app.vault.modify(file, value);
    else await this.app.vault.create(path, value);
  }

  collectionFile(collectionId) {
    return this.app.vault.getMarkdownFiles().find((file) => {
      if (!file.path.startsWith(COLLECTION_FOLDER)) return false;
      return text(this.app.metadataCache.getFileCache(file)?.frontmatter?.collection_id) === text(collectionId);
    }) || null;
  }

  buildCollectionRows(items) {
    const groups = new Map();
    for (const item of items) {
      const id = text(item.collection_id);
      if (!id) continue;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(item);
    }
    const rows = [];
    for (const [id, members] of groups) {
      if (members.length < 2) continue;
      members.sort((a, b) => Number(a.collection_order || 9999) - Number(b.collection_order || 9999) || text(a.title).localeCompare(text(b.title), "zh-CN"));
      const first = members[0];
      rows.push({
        collection_id: id,
        collection_name: text(first.collection_name, id),
        collection_original_name: text(first.collection_original_name),
        media_type: members.every((item) => item.media_type === "电影") ? "电影" : "电视剧",
        count: members.length,
        poster: text(members.find((item) => item.poster)?.poster),
        members: members.map((item) => text(item.source_title, item.title)),
      });
    }
    return rows.sort((a, b) => a.collection_name.localeCompare(b.collection_name, "zh-CN"));
  }

  collectionMarkdown(row, members) {
    const links = members.map((member, index) => {
      const path = text(member.file).replace(/\.md$/i, "");
      return `${index + 1}. [[${path}|${text(member.title)}]]`;
    });
    const frontmatter = [
      "---",
      "type: 影视合集",
      `collection_id: ${JSON.stringify(row.collection_id)}`,
      `collection_name: ${JSON.stringify(row.collection_name)}`,
      `collection_original_name: ${JSON.stringify(row.collection_original_name)}`,
      `media_type: ${JSON.stringify(row.media_type)}`,
      `count: ${row.count}`,
      `poster: ${JSON.stringify(row.poster)}`,
      "---", "", `# ${row.collection_name}`, "",
    ];
    if (row.collection_original_name) frontmatter.push(`*${row.collection_original_name}*`, "");
    return `${[...frontmatter, "## 成员", "", ...links, ""].join("\n")}\n`;
  }

  async capturePaths(paths) {
    const snapshots = new Map();
    for (const path of new Set(paths.filter(Boolean))) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        snapshots.set(path, { exists: false });
        continue;
      }
      const binary = !/\.(?:md|json)$/i.test(path);
      snapshots.set(path, {
        exists: true,
        binary,
        data: binary ? await this.app.vault.readBinary(file) : await this.app.vault.read(file),
      });
    }
    return snapshots;
  }

  async restoreSnapshots(snapshots) {
    for (const [path, snapshot] of snapshots) {
      if (!snapshot.exists) continue;
      const current = this.app.vault.getAbstractFileByPath(path);
      this.internalWrites.add(path);
      if (snapshot.binary) {
        if (current instanceof TFile) await this.app.vault.modifyBinary(current, snapshot.data);
        else await this.app.vault.createBinary(path, snapshot.data);
      } else if (current instanceof TFile) {
        await this.app.vault.modify(current, snapshot.data);
      } else {
        await this.app.vault.create(path, snapshot.data);
      }
    }
  }

  catalogCounts(items, previous = {}) {
    return {
      ...previous,
      total: items.length,
      movies: items.filter((item) => item.media_type === "电影").length,
      series: items.filter((item) => item.media_type !== "电影").length,
      posters: items.filter((item) => item.poster_status === "ok").length,
      ratings: items.filter((item) => typeof item.rating === "number").length,
      certifications: items.filter((item) => !["", "分级未确认"].includes(text(item.certification_zh))).length,
      plots: items.filter((item) => Boolean(item.plot)).length,
      netflix_true: items.filter((item) => item.netflix === true).length,
      netflix_unknown: items.filter((item) => item.netflix_status === "unknown").length,
    };
  }

  tombstone(item) {
    return {
      title: text(item.title),
      original_title: text(item.originalTitle),
      english_title: text(item.englishTitle),
      aliases: [...(item.aliases || [])],
      year: text(item.year),
      imdb_id: text(item.imdbId),
      tmdb_id: text(item.tmdbId),
      file: stableItemKey(item),
      deleted_at: dateStamp(),
      reason: "Movie Wall 用户删除",
    };
  }

  async syncCollectionMemberFiles(items, affectedIds) {
    for (const item of items) {
      if (!affectedIds.has(text(item.collection_id)) && !item.__dissolved) continue;
      const file = this.app.vault.getAbstractFileByPath(text(item.file));
      if (!(file instanceof TFile)) continue;
      await this.updateFrontMatter(file, (frontmatter) => {
        if (item.__dissolved || !item.collection_id) {
          delete frontmatter.collection_id;
          delete frontmatter.collection_name;
          delete frontmatter.collection_original_name;
          delete frontmatter.collection_order;
        } else {
          frontmatter.collection_id = item.collection_id;
          frontmatter.collection_name = item.collection_name;
          frontmatter.collection_original_name = item.collection_original_name || "";
          frontmatter.collection_order = item.collection_order;
        }
      });
    }
  }

  async deleteItems(items) {
    const unique = [...new Map(items.map((item) => [stableItemKey(item), item])).values()];
    if (!unique.length) return { deletedPaths: [], affectedCollections: [] };
    const catalog = await this.readJson(CATALOG_PATH, {});
    const collections = await this.readJson(COLLECTIONS_PATH, { collections: [] });
    const deletedPayload = await this.readJson(DELETED_ITEMS_PATH, { schema_version: 1, items: [] });
    const targets = (catalog.items || []).filter((raw) => unique.some((item) => catalogMatchesItem(raw, item)));
    if (targets.length !== unique.length) throw new Error("catalog identity mismatch");
    const targetFiles = new Set(targets.map((item) => text(item.file)));
    const affectedIds = new Set(targets.map((item) => text(item.collection_id)).filter(Boolean));
    const remaining = (catalog.items || []).filter((item) => !targetFiles.has(text(item.file))).map((item) => ({ ...item }));
    for (const id of affectedIds) {
      const members = remaining.filter((item) => text(item.collection_id) === id)
        .sort((a, b) => Number(a.collection_order || 9999) - Number(b.collection_order || 9999));
      if (members.length <= 1) {
        for (const member of members) {
          member.collection_id = "";
          member.collection_name = "";
          member.collection_original_name = "";
          member.collection_order = "";
          member.__dissolved = true;
        }
      } else {
        members.forEach((member, index) => { member.collection_order = index + 1; });
      }
    }
    const cleanRemaining = remaining.map((item) => {
      const copy = { ...item };
      delete copy.__dissolved;
      return copy;
    });
    const collectionRows = this.buildCollectionRows(cleanRemaining);
    const referenced = new Set(cleanRemaining.flatMap((item) => [...posterPaths(item)]));
    const orphanPosters = new Set(targets.flatMap((item) => [...posterPaths(item)]).filter((path) => !referenced.has(path)));
    const collectionFiles = new Map([...affectedIds].map((id) => [id, this.collectionFile(id)]));
    const paths = [CATALOG_PATH, COLLECTIONS_PATH, DELETED_ITEMS_PATH, ...targetFiles, ...orphanPosters];
    for (const item of remaining) if (affectedIds.has(text(item.collection_id)) || item.__dissolved) paths.push(text(item.file));
    for (const file of collectionFiles.values()) if (file) paths.push(file.path);
    for (const path of paths) {
      if (!path.startsWith("Media Library/") || /[:\\]/.test(path) || path.split("/").some(x => ["..", ".", ""].includes(x))) throw new Error("Unsafe media path; operation cancelled");
    }
    const snapshots = await this.capturePaths(paths);
    const tombstones = [...(deletedPayload.items || [])];
    for (const item of unique) {
      const row = this.tombstone(item);
      if (!tombstones.some((existing) => text(existing.file) === row.file || (row.imdb_id && existing.imdb_id === row.imdb_id))) tombstones.push(row);
    }
    try {
      await this.syncCollectionMemberFiles(remaining, affectedIds);
      for (const id of affectedIds) {
        const row = collectionRows.find((candidate) => candidate.collection_id === id);
        const file = collectionFiles.get(id);
        if (row && file instanceof TFile) {
          const members = cleanRemaining.filter((item) => item.collection_id === id).sort((a, b) => Number(a.collection_order) - Number(b.collection_order));
          await this.writeVaultText(file.path, this.collectionMarkdown(row, members));
        }
      }
      const nextCatalog = {
        ...catalog,
        updated: dateStamp(),
        source_count: Math.max(cleanRemaining.length, Number(catalog.source_count || 0) - targets.length),
        counts: this.catalogCounts(cleanRemaining, catalog.counts || {}),
        items: cleanRemaining,
      };
      await this.writeVaultText(CATALOG_PATH, jsonText(nextCatalog));
      await this.writeVaultText(COLLECTIONS_PATH, jsonText({ ...collections, updated: dateStamp(), collections: collectionRows }));
      await this.writeVaultText(DELETED_ITEMS_PATH, jsonText({ ...deletedPayload, schema_version: 1, updated: dateStamp(), items: tombstones }));

      const trash = [];
      for (const path of targetFiles) {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) trash.push(file);
      }
      for (const path of orphanPosters) {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) trash.push(file);
      }
      for (const id of affectedIds) {
        if (collectionRows.some((row) => row.collection_id === id)) continue;
        const file = collectionFiles.get(id);
        if (file instanceof TFile) trash.push(file);
      }
      for (const file of trash) await this.app.fileManager.trashFile(file);
      return {
        deletedPaths: [...targetFiles],
        affectedCollections: [...affectedIds],
        remainingItems: cleanRemaining,
      };
    } catch (error) {
      await this.restoreSnapshots(snapshots);
      console.error("Movie Wall: delete transaction rolled back", error);
      new Notice("删除未完成，所有文件与数据已回滚；请检查回收站权限后重试。");
      throw error;
    }
  }

  async dissolveCollection(collection) {
    const id = text(collection?.id);
    if (!id) throw new Error("missing collection id");
    const catalog = await this.readJson(CATALOG_PATH, {});
    const collections = await this.readJson(COLLECTIONS_PATH, { collections: [] });
    const items = (catalog.items || []).map((item) => ({ ...item }));
    const members = items.filter((item) => text(item.collection_id) === id);
    if (!members.length) throw new Error("collection not found");
    for (const member of members) {
      member.collection_id = "";
      member.collection_name = "";
      member.collection_original_name = "";
      member.collection_order = "";
      member.__dissolved = true;
    }
    const collectionFile = this.collectionFile(id);
    const paths = [CATALOG_PATH, COLLECTIONS_PATH, ...members.map((item) => text(item.file))];
    if (collectionFile) paths.push(collectionFile.path);
    for (const path of paths) {
      if (!path.startsWith("Media Library/") || /[:\\]/.test(path) || path.split("/").some(x => ["..", ".", ""].includes(x))) throw new Error("Unsafe media path; operation cancelled");
    }
    const snapshots = await this.capturePaths(paths);
    try {
      await this.syncCollectionMemberFiles(members, new Set([id]));
      const clean = items.map((item) => { const copy = { ...item }; delete copy.__dissolved; return copy; });
      await this.writeVaultText(CATALOG_PATH, jsonText({ ...catalog, updated: dateStamp(), items: clean }));
      await this.writeVaultText(COLLECTIONS_PATH, jsonText({ ...collections, updated: dateStamp(), collections: this.buildCollectionRows(clean) }));
      if (collectionFile instanceof TFile) await this.app.fileManager.trashFile(collectionFile);
      return { id, memberPaths: members.map((item) => text(item.file)) };
    } catch (error) {
      await this.restoreSnapshots(snapshots);
      console.error("Movie Wall: dissolve transaction rolled back", error);
      new Notice("解散合集未完成，所有文件与数据已回滚。");
      throw error;
    }
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }

  refreshViews(reloadItems = false) {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view && typeof leaf.view.scheduleRender === "function") leaf.view.scheduleRender(reloadItems);
    }
  }

  onunload() {
    this.navigation.closeAll();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
}

class MovieWallView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.query = "";
    this.genre = "all";
    this.sort = "title";
    this.mediaFilter = MEDIA_FILTERS.has(plugin.settings?.mediaFilter) ? plugin.settings.mediaFilter : "all";
    this.watchFilter = WATCH_FILTERS.includes(plugin.settings?.watchFilter) ? plugin.settings.watchFilter : "all";
    this.itemsCache = null;
    this.renderTimer = null;
    this.compactVisible = false;
    this.compactSearchOpen = false;
    this.headerObserver = null;
    this.scrollUiFrame = null;
    this.selectedItems = new Map();
    this.selectionToolbarEl = null;
    this.deletingSelection = false;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "影视库"; }
  getIcon() { return "clapperboard"; }

  async onOpen() {
    this.itemsCache = this.loadItems();
    this.render();
    const scroller = this.scrollElement();
    if (scroller) this.registerDomEvent(scroller, "scroll", () => this.scheduleScrollUiUpdate(), { passive: true });
    this.registerDomEvent(window, "resize", () => this.setupScrollNavigation(), { passive: true });
  }
  async onClose() {
    if (this.renderTimer) window.clearTimeout(this.renderTimer);
    if (this.scrollUiFrame) window.cancelAnimationFrame(this.scrollUiFrame);
    if (this.headerObserver) this.headerObserver.disconnect();
  }

  scheduleRender(reloadItems = false) {
    if (reloadItems) this.itemsCache = null;
    if (this.renderTimer) window.clearTimeout(this.renderTimer);
    this.renderTimer = window.setTimeout(() => this.render(), 120);
  }

  applyMediaFilter(filter) {
    if (!MEDIA_FILTERS.has(filter)) return;
    this.mediaFilter = filter;
    this.render();
  }

  applyWatchFilter(filter) {
    if (!WATCH_FILTERS.includes(filter)) return;
    this.watchFilter = filter;
    this.render();
  }

  scrollElement() {
    return this.containerEl.querySelector(":scope > .view-content") || this.containerEl.children[1] || null;
  }

  captureNavigationState() {
    const scroller = this.scrollElement();
    return {
      type: "library",
      scrollTop: scroller?.scrollTop || 0,
      mediaFilter: this.mediaFilter,
      watchFilter: this.watchFilter,
      searchQuery: this.query,
    };
  }

  restoreNavigationState(state) {
    if (!state) return;
    const mediaFilter = MEDIA_FILTERS.has(state.mediaFilter) ? state.mediaFilter : this.mediaFilter;
    const watchFilter = WATCH_FILTERS.includes(state.watchFilter) ? state.watchFilter : this.watchFilter;
    const query = text(state.searchQuery).toLocaleLowerCase("zh-CN");
    const needsRender = mediaFilter !== this.mediaFilter || watchFilter !== this.watchFilter || query !== this.query;
    this.mediaFilter = mediaFilter;
    this.watchFilter = watchFilter;
    this.query = query;
    this.compactSearchOpen = false;
    if (needsRender) this.render({ scrollTop: Number(state.scrollTop) || 0 });
    else this.restoreScroll(Number(state.scrollTop) || 0);
  }

  isMobileLayout() {
    return document.body.classList.contains("is-mobile") || Boolean(window.matchMedia?.("(max-width: 700px)")?.matches);
  }

  setCompactVisible(visible) {
    const next = Boolean(visible) && this.isMobileLayout();
    const changed = next !== this.compactVisible;
    this.compactVisible = next;
    const compactShell = this.containerEl.querySelector(".movie-wall-compact-shell");
    const needsDomSync = compactShell && compactShell.classList.contains("is-visible") !== next;
    if (compactShell && (changed || needsDomSync)) {
      compactShell.classList.toggle("is-visible", next);
      compactShell.setAttribute("aria-hidden", String(!next));
    }
    if (!next && (changed || this.compactSearchOpen)) this.setCompactSearchOpen(false, false);
  }

  setCompactSearchOpen(open, focus = true) {
    this.compactSearchOpen = Boolean(open) && this.compactVisible;
    const panel = this.containerEl.querySelector(".movie-wall-compact-search-panel");
    const toggle = this.containerEl.querySelector(".movie-wall-compact-search-toggle");
    if (panel) {
      panel.classList.toggle("is-visible", this.compactSearchOpen);
      panel.setAttribute("aria-hidden", String(!this.compactSearchOpen));
    }
    if (toggle) toggle.setAttribute("aria-expanded", String(this.compactSearchOpen));
    if (this.compactSearchOpen && focus) {
      afterLayout(() => this.containerEl.querySelector(".movie-wall-compact-search-input")?.focus());
    }
  }

  setupScrollNavigation() {
    if (this.headerObserver) this.headerObserver.disconnect();
    this.headerObserver = null;
    const scroller = this.scrollElement();
    const sentinel = this.containerEl.querySelector(".movie-wall-header-sentinel");
    if (!scroller || !sentinel || !this.isMobileLayout()) {
      this.setCompactVisible(false);
      this.scheduleScrollUiUpdate();
      return;
    }
    if ("IntersectionObserver" in window) {
      this.headerObserver = new window.IntersectionObserver((entries) => {
        const entry = entries.find((candidate) => candidate.target === sentinel);
        if (!entry || !sentinel.isConnected) return;
        const passedTop = entry.rootBounds
          ? entry.boundingClientRect.bottom <= entry.rootBounds.top
          : scroller.scrollTop >= sentinel.offsetTop;
        this.setCompactVisible(!entry.isIntersecting && passedTop && scroller.scrollTop > 0);
      }, { root: scroller, threshold: 0 });
      this.headerObserver.observe(sentinel);
    }
    this.scheduleScrollUiUpdate();
  }

  scheduleScrollUiUpdate() {
    if (this.scrollUiFrame) return;
    this.scrollUiFrame = window.requestAnimationFrame(() => {
      this.scrollUiFrame = null;
      this.updateScrollUi();
    });
  }

  updateScrollUi() {
    const scroller = this.scrollElement();
    if (!scroller) return;
    const current = scroller.scrollTop;
    if (!this.headerObserver && this.isMobileLayout()) {
      const sentinel = this.containerEl.querySelector(".movie-wall-header-sentinel");
      if (sentinel) {
        const rootTop = scroller.getBoundingClientRect().top;
        this.setCompactVisible(sentinel.getBoundingClientRect().bottom <= rootTop && current > 0);
      }
    }
    const enabled = current > Math.max(1000, (scroller.clientHeight || 0) * 2);
    const compactTop = this.containerEl.querySelector(".movie-wall-compact-top");
    if (compactTop && (compactTop.disabled === enabled || compactTop.classList.contains("is-enabled") !== enabled)) {
      compactTop.disabled = !enabled;
      compactTop.classList.toggle("is-enabled", enabled);
    }
    const backToTop = this.containerEl.querySelector(".movie-wall-back-to-top");
    const desktopTopVisible = !this.isMobileLayout() && enabled;
    if (backToTop && backToTop.hidden === desktopTopVisible) backToTop.hidden = !desktopTopVisible;
  }

  scrollToTop() {
    const target = this.scrollElement();
    if (target) target.scrollTo({ top: 0, behavior: "smooth" });
  }

  restoreScroll(scrollTop) {
    const target = Math.max(0, Number(scrollTop) || 0);
    afterLayout(() => {
      const scroller = this.scrollElement();
      if (!scroller) return;
      scroller.scrollTop = target;
      this.scheduleScrollUiUpdate();
    });
  }

  selectionActive() {
    return this.selectedItems.size > 0;
  }

  createSelectionToolbar() {
    const toolbar = el("div", "movie-wall-selection-toolbar");
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "已选择作品操作");
    const cancel = el("button", "movie-wall-selection-cancel", "取消");
    cancel.type = "button";
    cancel.addEventListener("click", () => this.cancelSelection());
    const count = el("div", "movie-wall-selection-count", "已选择 0 项");
    const remove = el("button", "movie-wall-selection-delete");
    remove.type = "button";
    setIcon(remove, "trash-2");
    remove.append(el("span", "", "删除"));
    remove.addEventListener("click", () => this.deleteSelection());
    toolbar.append(cancel, count, remove);
    this.selectionToolbarEl = toolbar;
    this.updateSelectionUi();
    return toolbar;
  }

  updateSelectionUi() {
    const active = this.selectionActive();
    const root = this.containerEl.querySelector(":scope > .view-content") || this.containerEl;
    root.classList.toggle("is-selecting", active);
    if (this.selectionToolbarEl) {
      this.selectionToolbarEl.classList.toggle("is-visible", active);
      this.selectionToolbarEl.setAttribute("aria-hidden", String(!active));
      const count = this.selectionToolbarEl.querySelector(".movie-wall-selection-count");
      if (count) count.textContent = `已选择 ${this.selectedItems.size} 项`;
      const remove = this.selectionToolbarEl.querySelector(".movie-wall-selection-delete");
      if (remove) remove.disabled = !active || this.deletingSelection;
    }
    for (const card of root.querySelectorAll(".movie-wall-card[data-item-path]")) {
      const selected = this.selectedItems.has(card.dataset.itemPath);
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-selected", String(selected));
    }
  }

  toggleSelection(item, force = null) {
    const key = stableItemKey(item);
    const shouldSelect = force === null ? !this.selectedItems.has(key) : Boolean(force);
    if (shouldSelect) this.selectedItems.set(key, item);
    else this.selectedItems.delete(key);
    this.updateSelectionUi();
  }

  cancelSelection() {
    this.selectedItems.clear();
    this.updateSelectionUi();
  }

  bindSelectableCard(card, item, navigationParent = this) {
    const host = typeof navigationParent?.toggleSelection === "function" ? navigationParent : this;
    const open = () => this.plugin.navigation.openMovie(this, item, navigationParent);
    let timer = null;
    let origin = null;
    let suppressClick = false;
    const cancelTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      origin = null;
      card.classList.remove("is-long-pressing");
    };
    card.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button")) return;
      origin = { x: event.clientX, y: event.clientY };
      card.classList.add("is-long-pressing");
      timer = window.setTimeout(() => {
        timer = null;
        suppressClick = true;
        card.classList.remove("is-long-pressing");
        host.toggleSelection(item, true);
        if (navigator.vibrate) navigator.vibrate(20);
      }, LONG_PRESS_MS);
    });
    card.addEventListener("pointermove", (event) => {
      if (!origin) return;
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > LONG_PRESS_MOVE_PX) cancelTimer();
    });
    card.addEventListener("pointerup", cancelTimer);
    card.addEventListener("pointercancel", cancelTimer);
    card.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse") cancelTimer(); });
    card.addEventListener("contextmenu", (event) => {
      if (event.target.closest("button")) return;
      event.preventDefault();
      cancelTimer();
      host.toggleSelection(item, true);
    });
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      if (event.ctrlKey || event.metaKey || host.selectionActive()) {
        event.preventDefault();
        host.toggleSelection(item);
      } else open();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey || host.selectionActive()) host.toggleSelection(item);
      else open();
    });
  }

  async deleteSelection() {
    if (!this.selectedItems.size || this.deletingSelection) return;
    const selected = [...this.selectedItems.values()];
    const confirmed = await DeleteConfirmModal.confirm(this.app, selected);
    if (!confirmed) return;
    this.deletingSelection = true;
    this.updateSelectionUi();
    try {
      const result = await this.plugin.deleteItems(selected);
      this.applyDeletionResult(result);
      this.cancelSelection();
      new Notice(`已将 ${selected.length} 个条目移至系统回收站。`);
    } catch (_) {
      // deleteItems has already rolled back and reported the error.
    } finally {
      this.deletingSelection = false;
      this.updateSelectionUi();
    }
  }

  updateVisibleCounters() {
    if (!this.itemsCache) return;
    const total = this.containerEl.querySelector(".movie-wall-total");
    if (total) total.textContent = `共 ${this.itemsCache.length} 部作品`;
    const walls = this.visibleWalls(this.itemsCache);
    for (const section of this.containerEl.querySelectorAll(".movie-wall-section")) {
      const label = section.querySelector("h2")?.textContent;
      const entries = label === "电影" ? walls.movies : (label === "电视剧" ? walls.series : []);
      const counter = section.querySelector(".movie-wall-section-heading span");
      if (counter) counter.textContent = `${this.workCount(entries)} 部`;
    }
  }

  applyDeletionResult(result) {
    const deleted = new Set(result.deletedPaths || []);
    if (!this.itemsCache) this.itemsCache = this.loadItems();
    this.itemsCache = this.itemsCache.filter((item) => !deleted.has(stableItemKey(item)));
    for (const card of this.containerEl.querySelectorAll(".movie-wall-card[data-item-path]")) {
      if (!deleted.has(card.dataset.itemPath)) continue;
      card.classList.add("is-removing");
      window.setTimeout(() => card.remove(), 180);
    }
    for (const id of result.affectedCollections || []) {
      const card = this.containerEl.querySelector(`.movie-wall-collection-card[data-collection-id="${CSS.escape(id)}"]`);
      if (!card) continue;
      const members = this.itemsCache.filter((item) => item.collectionId === id);
      card.classList.add("is-removing");
      window.setTimeout(() => {
        if (!card.isConnected) return;
        if (members.length >= 2) {
          card.replaceWith(this.collectionCard({ id, members, title: members[0].collectionName || members[0].title, originalTitle: members[0].collectionOriginalName, mediaType: members.every((item) => item.mediaType === "电影") ? "电影" : "电视剧" }));
        } else if (members.length === 1) {
          members[0].collectionId = "";
          members[0].collectionName = "";
          members[0].collectionOriginalName = "";
          members[0].collectionOrder = 9999;
          card.replaceWith(this.movieCard(members[0]));
        } else card.remove();
      }, 180);
    }
    this.updateVisibleCounters();
  }

  applyDissolveResult(collection) {
    if (!this.itemsCache) return;
    const members = this.itemsCache.filter((item) => item.collectionId === collection.id);
    for (const member of members) {
      member.collectionId = "";
      member.collectionName = "";
      member.collectionOriginalName = "";
      member.collectionOrder = 9999;
    }
    const card = this.containerEl.querySelector(`.movie-wall-collection-card[data-collection-id="${CSS.escape(collection.id)}"]`);
    if (!card) return;
    const fragment = document.createDocumentFragment();
    for (const member of members) fragment.append(this.movieCard(member));
    card.replaceWith(fragment);
    this.updateVisibleCounters();
  }

  loadItems() {
    const items = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(ENTRY_FOLDER)) continue;
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!frontmatter || !["影视", "movie", "tv"].includes(frontmatter.type)) continue;
      const item = {
        file,
        title: text(frontmatter.title, file.basename),
        originalTitle: text(frontmatter.original_title),
        englishTitle: text(frontmatter.english_title),
        aliases: asList(frontmatter.aliases),
        imdbId: text(frontmatter.imdb_id),
        tmdbId: text(frontmatter.tmdb_id),
        mediaType: text(frontmatter.media_type, frontmatter.type === "tv" ? "电视剧" : "电影"),
        year: text(frontmatter.year),
        country: asList(frontmatter.country),
        genres: asList(frontmatter.genres),
        rating: frontmatter.rating,
        ratingSource: text(frontmatter.rating_source),
        certification: text(frontmatter.certification_zh, "分级未确认"),
        certificationOriginal: text(frontmatter.certification_original),
        certificationRegion: text(frontmatter.certification_region),
        certificationSource: text(frontmatter.certification_source),
        certificationChecked: text(frontmatter.certification_checked),
        certificationType: text(frontmatter.certification_type, "insufficient"),
        certificationConfidence: text(frontmatter.certification_confidence),
        certificationReason: asList(frontmatter.certification_reason),
        contentAdvisory: asObject(frontmatter.content_advisory),
        netflix: asBool(frontmatter.netflix),
        netflixStatus: text(frontmatter.netflix_status, "unknown"),
        netflixRegions: asList(frontmatter.netflix_regions),
        netflixChecked: text(frontmatter.netflix_checked),
        netflixSource: text(frontmatter.netflix_source),
        watched: Object.hasOwn(this.plugin.legacyStatuses || {}, frontmatter.id) ? this.plugin.legacyStatuses[frontmatter.id] === true : asBool(frontmatter.watched),
        personalRating: frontmatter.personal_rating,
        poster: text(frontmatter.poster),
        posterFit: ["cover", "contain"].includes(frontmatter.poster_fit) ? frontmatter.poster_fit : "cover",
        posterPosition: text(frontmatter.poster_position, "center center"),
        collectionId: text(frontmatter.collection_id),
        collectionName: text(frontmatter.collection_name),
        collectionOriginalName: text(frontmatter.collection_original_name),
        collectionOrder: Number(frontmatter.collection_order) || 9999,
        seasonCount: text(frontmatter.season_count),
        seasons: objectList(frontmatter.seasons),
        releasedSeasonCount: Number(frontmatter.released_season_count || frontmatter.season_count) || 0,
        releasedSeasons: numberList(frontmatter.released_seasons),
        upcomingSeasons: objectList(frontmatter.upcoming_seasons),
        watchedSeasons: asList(frontmatter.watched_seasons),
        watchedSeasonKeys: seasonWatchKeys(frontmatter.watched_seasons),
        seasonDetails: asList(frontmatter.season_details),
        episodeCount: Number(frontmatter.episode_count) > 0 ? text(frontmatter.episode_count) : "",
        seasonEpisodeCounts: asList(frontmatter.season_episode_counts),
        seriesStatus: text(frontmatter.series_status),
        specials: objectList(frontmatter.specials),
        specialEpisodeCount: Number(frontmatter.special_episode_count) || 0,
        partCount: Number(frontmatter.part_count) || 0,
        seriesFormat: text(frontmatter.series_format),
        plot: text(frontmatter.plot || frontmatter.overview),
      };
      if (item.mediaType !== "电影" && item.watchedSeasonKeys.size) {
        const releasedKeys = this.releasedSeasonKeys(item);
        if (releasedKeys.size) item.watched = [...releasedKeys].every((key) => item.watchedSeasonKeys.has(key));
      }
      items.push(item);
    }
    return items.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  }

  resourcePath(path) {
    if (!path) return "";
    if (typeof path !== "string" || path.length > 500 || /[:\\]/.test(path) || path.startsWith("/") || path.split("/").some(x => [".", "..", ""].includes(x))) return "";
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile && /^(png|jpe?g|webp|gif|avif)$/i.test(file.extension) ? this.app.vault.getResourcePath(file) : "";
  }

  releasedSeasonRows(item) {
    const rows = item.seasons.filter(isReleasedSeason);
    if (rows.length) return rows;
    return item.releasedSeasons.map((season) => ({ season, status: "released", label: `第${season}季` }));
  }

  releasedSeasonKeys(item) {
    return new Set(this.releasedSeasonRows(item).map((season) => seasonWatchKey(season)).filter(Boolean));
  }

  effectiveWatchedSeasonKeys(item) {
    const explicit = new Set(item.watchedSeasonKeys || []);
    if (explicit.size || !item.watched) return explicit;
    return this.releasedSeasonKeys(item);
  }

  seasonStats(item) {
    const released = this.releasedSeasonKeys(item);
    const watchedKeys = this.effectiveWatchedSeasonKeys(item);
    const watched = [...released].filter((key) => watchedKeys.has(key)).length;
    return { released, watchedKeys, watched, total: released.size, completed: released.size > 0 && watched === released.size };
  }

  isSeasonWatched(item, season, special = false, index = 0) {
    const key = seasonWatchKey(season, special, index);
    return Boolean(key) && this.effectiveWatchedSeasonKeys(item).has(key);
  }

  searchText(item) {
    return [item.title, item.originalTitle, item.englishTitle, ...item.aliases].join(" ").toLocaleLowerCase("zh-CN");
  }

  matchesMediaFilter(item) {
    if (this.mediaFilter === "movie") return item.mediaType === "电影";
    if (this.mediaFilter === "tv") return item.mediaType !== "电影";
    return true;
  }

  entryWatched(entry) {
    if (!entry.members) return entry.watched === true;
    return entry.members.length > 0 && entry.members.every((member) => member.watched === true);
  }

  matchesWatchFilter(entry) {
    if (this.watchFilter === "watched") return this.entryWatched(entry);
    if (this.watchFilter === "unwatched") return !this.entryWatched(entry);
    return true;
  }

  entrySearchText(entry) {
    if (!entry.members) return this.searchText(entry);
    return [entry.title, entry.originalTitle, ...entry.members.map((member) => this.searchText(member))]
      .join(" ")
      .toLocaleLowerCase("zh-CN");
  }

  visibleWalls(items) {
    const byType = items.filter((item) => this.matchesMediaFilter(item) && (this.genre === "all" || item.genres.includes(this.genre)));
    const value = item => this.sort === "year" ? Number(item.year) || 0 : Number(item.rating) || 0;
    byType.sort((a,b) => this.sort === "title" ? a.title.localeCompare(b.title, "zh-CN") : value(b)-value(a) || a.title.localeCompare(b.title, "zh-CN"));
    const walls = this.buildWalls(byType);
    const filterEntries = (entries) => entries.filter((entry) => {
      if (!this.matchesWatchFilter(entry)) return false;
      return !this.query || this.entrySearchText(entry).includes(this.query);
    });
    return { movies: filterEntries(walls.movies), series: filterEntries(walls.series) };
  }

  workCount(entries) {
    return entries.reduce((count, entry) => count + (entry.members ? entry.members.length : 1), 0);
  }

  createFilterControls(allItems, movieCount, tvCount, compact = false) {
    const filterControls = el("div", `movie-wall-filter-controls${compact ? " is-compact" : ""}`);
    const segmented = el("div", "movie-wall-segmented");
    segmented.setAttribute("role", "radiogroup");
    segmented.setAttribute("aria-label", "影视类型筛选");
    const filters = [
      ["all", "全部", allItems.length],
      ["movie", "电影", movieCount],
      ["tv", "电视剧", tvCount],
    ];
    for (const [value, label, count] of filters) {
      const selected = this.mediaFilter === value;
      const button = el("button", `movie-wall-segment${selected ? " is-active" : ""}`);
      button.type = "button";
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(selected));
      button.dataset.filter = value;
      button.append(el("span", "movie-wall-segment-label", label), el("span", "movie-wall-segment-count", count));
      button.addEventListener("click", () => this.plugin.setMediaFilter(value));
      segmented.append(button);
    }
    filterControls.append(segmented);

    const watchModes = {
      all: { icon: "◉", long: "全部", short: "全部" },
      watched: { icon: "✓", long: "已观看", short: "已看" },
      unwatched: { icon: "○", long: "未观看", short: "未看" },
    };
    const watchMode = watchModes[this.watchFilter] || watchModes.all;
    const watchButton = el("button", `movie-wall-watch-filter is-${this.watchFilter}`);
    watchButton.type = "button";
    watchButton.setAttribute("aria-label", `观看状态：${watchMode.long}；点击切换`);
    watchButton.title = "依次切换：全部 → 已观看 → 未观看";
    watchButton.append(
      el("span", "movie-wall-watch-filter-icon", watchMode.icon),
      el("span", "movie-wall-watch-filter-long", watchMode.long),
      el("span", "movie-wall-watch-filter-short", watchMode.short),
    );
    watchButton.addEventListener("click", () => this.plugin.cycleWatchFilter());
    filterControls.append(watchButton);
    return filterControls;
  }

  createSearchInput(className, focusTarget) {
    const search = el("input", className);
    search.type = "search";
    search.placeholder = "搜索中文名 / 原名";
    search.value = this.query;
    search.setAttribute("aria-label", "搜索中文名、原名、英文名或别名");
    search.addEventListener("input", () => {
      this.query = search.value.trim().toLocaleLowerCase("zh-CN");
      if (focusTarget === "compact") this.compactSearchOpen = true;
      this.render({ focusSearch: focusTarget });
    });
    return search;
  }

  buildWalls(items) {
    const grouped = new Map();
    for (const item of items) {
      if (!item.collectionId) continue;
      if (!grouped.has(item.collectionId)) grouped.set(item.collectionId, []);
      grouped.get(item.collectionId).push(item);
    }
    const collapsed = new Set([...grouped.entries()].filter(([, members]) => members.length > 1).map(([id]) => id));
    const singles = items.filter((item) => !collapsed.has(item.collectionId));
    const collections = [...grouped.entries()]
      .filter(([id]) => collapsed.has(id))
      .map(([id, members]) => {
        members.sort((a, b) => a.collectionOrder - b.collectionOrder || a.title.localeCompare(b.title, "zh-CN"));
        return {
          id,
          members,
          title: members[0].collectionName || members[0].title,
          originalTitle: members[0].collectionOriginalName,
          mediaType: members.every((item) => item.mediaType === "电影") ? "电影" : "电视剧",
        };
      });
    return {
      movies: [...singles.filter((x) => x.mediaType === "电影"), ...collections.filter((x) => x.mediaType === "电影")],
      series: [...singles.filter((x) => x.mediaType !== "电影"), ...collections.filter((x) => x.mediaType !== "电影")],
    };
  }

  render(options = {}) {
    const scroller = this.scrollElement();
    const savedScroll = options.scrollTop ?? scroller?.scrollTop ?? 0;
    const content = this.containerEl.children[1];
    content.empty();
    content.addClass("movie-wall-root");
    const allItems = this.itemsCache || (this.itemsCache = this.loadItems());
    const movieCount = allItems.filter((item) => item.mediaType === "电影").length;
    const tvCount = allItems.length - movieCount;

    content.append(this.createSelectionToolbar());

    const header = el("header", "movie-wall-header movie-wall-full-header");
    const titleBox = el("div", "movie-wall-heading");
    titleBox.append(el("h1", "", "影视库"), el("span", "movie-wall-total", `共 ${allItems.length} 部作品`));
    header.append(titleBox);
    const toolbar = el("div", "movie-wall-toolbar");
    toolbar.append(this.createFilterControls(allItems, movieCount, tvCount));
    toolbar.append(this.createSearchInput("movie-wall-search movie-wall-full-search", "full"));
    const genre = el("select", "movie-wall-extra-filter");
    genre.setAttribute("aria-label", "Genre / 类型");
    for (const name of ["all", ...new Set(allItems.flatMap(x => x.genres))]) {
      const option = el("option", "", name === "all" ? "All genres / 全部类型" : name); option.value = name; genre.append(option);
    }
    genre.value = this.genre;
    genre.addEventListener("change", () => { this.genre = genre.value; this.render({scrollTop: 0}); });
    toolbar.append(genre);
    const sort = el("select", "movie-wall-extra-filter"); sort.setAttribute("aria-label", "Sort / 排序");
    for (const [value, label] of [["title", "Title / 片名"], ["year", "Year ↓ / 年份"], ["rating", "Rating ↓ / 评分"]]) {
      const option = el("option", "", label); option.value = value; sort.append(option);
    }
    sort.value = this.sort; sort.addEventListener("change", () => { this.sort = sort.value; this.render({scrollTop: 0}); }); toolbar.append(sort);
    header.append(toolbar);
    content.append(header);

    const sentinel = el("div", "movie-wall-header-sentinel");
    sentinel.setAttribute("aria-hidden", "true");
    content.append(sentinel);

    const compactShell = el("div", `movie-wall-compact-shell${this.compactVisible ? " is-visible" : ""}`);
    compactShell.setAttribute("aria-hidden", String(!this.compactVisible));
    const compactHeader = el("nav", "movie-wall-compact-header");
    compactHeader.setAttribute("aria-label", "影视库滚动导航");
    compactHeader.append(this.createFilterControls(allItems, movieCount, tvCount, true));

    const compactSearchToggle = el("button", "movie-wall-compact-action movie-wall-compact-search-toggle");
    compactSearchToggle.type = "button";
    compactSearchToggle.setAttribute("aria-label", "打开搜索");
    compactSearchToggle.setAttribute("aria-expanded", String(this.compactSearchOpen));
    compactSearchToggle.title = "搜索";
    setIcon(compactSearchToggle, "search");
    compactSearchToggle.addEventListener("click", () => this.setCompactSearchOpen(!this.compactSearchOpen));
    compactHeader.append(compactSearchToggle);

    const compactTop = el("button", "movie-wall-compact-action movie-wall-compact-top");
    compactTop.type = "button";
    compactTop.disabled = true;
    compactTop.setAttribute("aria-label", "返回影视墙顶部");
    compactTop.title = "返回顶部";
    setIcon(compactTop, "arrow-up");
    compactTop.addEventListener("click", () => this.scrollToTop());
    compactHeader.append(compactTop);
    compactShell.append(compactHeader);

    const compactSearchPanel = el("div", `movie-wall-compact-search-panel${this.compactSearchOpen && this.compactVisible ? " is-visible" : ""}`);
    compactSearchPanel.setAttribute("aria-hidden", String(!(this.compactSearchOpen && this.compactVisible)));
    const compactSearch = this.createSearchInput("movie-wall-compact-search-input", "compact");
    compactSearch.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.setCompactSearchOpen(false, false);
    });
    compactSearchPanel.append(compactSearch);
    const compactSearchClose = el("button", "movie-wall-compact-search-close");
    compactSearchClose.type = "button";
    compactSearchClose.setAttribute("aria-label", "收起搜索");
    compactSearchClose.title = "收起搜索";
    setIcon(compactSearchClose, "x");
    compactSearchClose.addEventListener("click", () => this.setCompactSearchOpen(false, false));
    compactSearchPanel.append(compactSearchClose);
    compactShell.append(compactSearchPanel);
    content.append(compactShell);

    const walls = this.visibleWalls(allItems);
    const filteredMovies = this.workCount(walls.movies);
    const filteredTv = this.workCount(walls.series);
    const filteredTotal = filteredMovies + filteredTv;
    if (filteredTotal) {
      if (this.mediaFilter !== "tv" && walls.movies.length) {
        this.renderSection(content, "电影", walls.movies, filteredMovies);
      }
      if (this.mediaFilter !== "movie" && walls.series.length) {
        this.renderSection(content, "电视剧", walls.series, filteredTv);
      }
    } else {
      content.append(el("div", "movie-wall-empty", "没有找到符合当前条件的影片"));
    }
    const backToTop = el("button", "movie-wall-back-to-top");
    backToTop.type = "button";
    backToTop.hidden = true;
    backToTop.setAttribute("aria-label", "返回影视墙顶部");
    backToTop.title = "返回顶部";
    setIcon(backToTop, "arrow-up");
    backToTop.addEventListener("click", () => this.scrollToTop());
    content.append(backToTop);
    this.updateSelectionUi();
    this.setupScrollNavigation();
    this.restoreScroll(savedScroll);
    if (options.focusSearch) {
      const selector = options.focusSearch === "compact" ? ".movie-wall-compact-search-input" : ".movie-wall-full-search";
      afterLayout(() => {
        const next = this.containerEl.querySelector(selector);
        if (!next) return;
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      });
    }
  }

  renderSection(parent, label, entries, workCount) {
    const section = el("section", "movie-wall-section");
    const heading = el("div", "movie-wall-section-heading");
    heading.append(el("h2", "", label), el("span", "", `${workCount} 部`));
    section.append(heading);
    const grid = el("div", "movie-wall-grid");
    for (const entry of entries) {
      if (entry.members) grid.append(this.collectionCard(entry));
      else grid.append(this.movieCard(entry));
    }
    section.append(grid);
    parent.append(section);
  }

  posterNode(item, className = "movie-wall-poster") {
    const wrap = el("div", className);
    const src = this.resourcePath(item.poster);
    if (src) {
      const image = el("img", "movie-wall-poster-image");
      image.src = src;
      image.alt = `${item.title} 海报`;
      image.loading = "lazy";
      image.decoding = "async";
      image.style.objectFit = item.posterFit;
      image.style.objectPosition = item.posterPosition;
      const reveal = () => image.classList.add("is-loaded");
      if (image.complete) reveal();
      else image.addEventListener("load", reveal, { once: true });
      image.addEventListener("error", () => { image.remove(); wrap.append(el("div", "movie-wall-no-poster", "Poster unavailable / 海报待补")); }, {once: true});
      wrap.append(image);
    } else {
      wrap.append(el("div", "movie-wall-no-poster", "海报待补"));
    }
    return wrap;
  }

  badges(item, poster, onWatchedChange = null) {
    if (item.netflix) poster.append(el("span", "movie-wall-netflix", "N"));
    const button = el("button", `movie-wall-watched${item.watched ? " is-watched" : ""}`, item.watched ? "✓" : "");
    button.type = "button";
    this.setWatchedButtonState(button, item.watched);
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (button.disabled) return;
      button.disabled = true;
      await this.toggleWatched(item);
      if (button.isConnected) button.disabled = false;
      if (onWatchedChange) onWatchedChange(item);
    });
    poster.append(button);
  }

  setWatchedButtonState(button, watched) {
    button.classList.toggle("is-watched", Boolean(watched));
    button.textContent = watched ? "✓" : "";
    button.setAttribute("aria-label", watched ? "标记为未观看" : "标记为已观看");
    button.title = watched ? "已观看，点击取消" : "标记为已观看";
  }

  movieCard(item, onWatchedChange = null, navigationParent = this) {
    const card = el("article", "movie-wall-card");
    card.tabIndex = 0;
    card.dataset.itemPath = item.file?.path || item.title;
    card.dataset.workCount = "1";
    const poster = this.posterNode(item);
    this.badges(item, poster, onWatchedChange);
    card.append(poster);
    const info = el("div", "movie-wall-card-info");
    info.append(el("div", "movie-wall-card-title", item.title));
    if (item.originalTitle && item.originalTitle !== item.title) info.append(el("div", "movie-wall-card-original", item.originalTitle));
    const seasonSummary = item.mediaType !== "电影" && item.releasedSeasonCount
      ? `${item.seriesFormat === "limited" ? "全" : ""}${item.releasedSeasonCount}季${item.episodeCount ? ` · ${item.episodeCount}集` : ""}`
      : "";
    const meta = [
      item.year,
      seasonSummary,
      item.rating !== "" && item.rating != null ? `★ ${item.rating}` : "",
      item.certification,
    ].filter(Boolean).join("　");
    info.append(el("div", "movie-wall-card-meta", meta));
    card.append(info);
    this.bindSelectableCard(card, item, navigationParent);
    return card;
  }

  collectionCard(collection) {
    const card = el("article", "movie-wall-card movie-wall-collection-card");
    card.tabIndex = 0;
    card.dataset.collectionId = collection.id;
    card.dataset.workCount = String(collection.members.length);
    const representative = collection.members.find((x) => x.poster) || collection.members[0];
    const poster = this.posterNode(representative, "movie-wall-poster movie-wall-collection-poster");
    poster.append(el("span", "movie-wall-count-badge", `${collection.members.length} 部`));
    const stats = this.collectionStats(collection);
    if (stats.completed) {
      const completed = el("span", "movie-wall-watched movie-wall-collection-watched is-watched", "✓");
      completed.setAttribute("aria-label", "合集已全部观看");
      poster.append(completed);
    }
    const netflixCount = collection.members.filter((x) => x.netflix).length;
    if (netflixCount) poster.append(el("span", "movie-wall-netflix movie-wall-netflix-count", `N ${netflixCount}/${collection.members.length}`));
    card.append(poster);
    const info = el("div", "movie-wall-card-info");
    info.append(el("div", "movie-wall-card-title", collection.title));
    if (collection.originalTitle) info.append(el("div", "movie-wall-card-original", collection.originalTitle));
    info.append(el("div", "movie-wall-card-meta movie-wall-collection-progress", stats.completed ? `✓ 已看 ${stats.watched}/${stats.total}` : `已看 ${stats.watched}/${stats.total}`));
    card.append(info);
    const open = () => this.plugin.navigation.openCollection(this, collection);
    const manage = () => new CollectionManagementModal(this.app, this.plugin, collection, this).open();
    let timer = null;
    let origin = null;
    let suppressClick = false;
    const cancelTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      origin = null;
      card.classList.remove("is-long-pressing");
    };
    card.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      origin = { x: event.clientX, y: event.clientY };
      card.classList.add("is-long-pressing");
      timer = window.setTimeout(() => {
        timer = null;
        suppressClick = true;
        card.classList.remove("is-long-pressing");
        manage();
        if (navigator.vibrate) navigator.vibrate(20);
      }, LONG_PRESS_MS);
    });
    card.addEventListener("pointermove", (event) => {
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > LONG_PRESS_MOVE_PX) cancelTimer();
    });
    card.addEventListener("pointerup", cancelTimer);
    card.addEventListener("pointercancel", cancelTimer);
    card.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse") cancelTimer(); });
    card.addEventListener("contextmenu", (event) => { event.preventDefault(); cancelTimer(); manage(); });
    card.addEventListener("click", (event) => {
      if (suppressClick) { suppressClick = false; event.preventDefault(); return; }
      open();
    });
    card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") open(); });
    return card;
  }

  collectionStats(collection) {
    const total = collection.members.length;
    const watched = collection.members.filter((member) => member.watched === true).length;
    return { total, watched, completed: total > 0 && watched === total };
  }

  removeFilteredCard(card) {
    if (!card || card.classList.contains("is-removing")) return;
    card.classList.add("is-removing");
    window.setTimeout(() => {
      if (!card.isConnected) return;
      const section = card.closest(".movie-wall-section");
      const count = Number(card.dataset.workCount) || 1;
      const counter = section?.querySelector(".movie-wall-section-heading span");
      if (counter) {
        const current = Number.parseInt(counter.textContent, 10) || 0;
        counter.textContent = `${Math.max(0, current - count)} 部`;
      }
      card.remove();
    }, 170);
  }

  syncCollectionCard(collectionId) {
    if (!collectionId || !this.itemsCache) return;
    const members = this.itemsCache.filter((member) => member.collectionId === collectionId);
    if (members.length < 2) return;
    const collection = { members };
    const stats = this.collectionStats(collection);
    for (const card of this.containerEl.querySelectorAll(".movie-wall-collection-card")) {
      if (card.dataset.collectionId !== collectionId) continue;
      const poster = card.querySelector(".movie-wall-collection-poster");
      let badge = poster?.querySelector(".movie-wall-collection-watched");
      if (stats.completed && !badge && poster) {
        badge = el("span", "movie-wall-watched movie-wall-collection-watched is-watched", "✓");
        badge.setAttribute("aria-label", "合集已全部观看");
        poster.append(badge);
      } else if (!stats.completed && badge) {
        badge.remove();
      }
      const progress = card.querySelector(".movie-wall-collection-progress");
      if (progress) progress.textContent = stats.completed ? `✓ 已看 ${stats.watched}/${stats.total}` : `已看 ${stats.watched}/${stats.total}`;
      const matches = this.watchFilter === "all"
        || (this.watchFilter === "watched" && stats.completed)
        || (this.watchFilter === "unwatched" && !stats.completed);
      if (!matches) this.removeFilteredCard(card);
    }
  }

  syncItemWatchedUi(item) {
    const path = item.file?.path || item.title;
    for (const card of this.containerEl.querySelectorAll(".movie-wall-card[data-item-path]")) {
      if (card.dataset.itemPath !== path) continue;
      const button = card.querySelector(".movie-wall-watched:not(.movie-wall-collection-watched)");
      if (button) this.setWatchedButtonState(button, item.watched);
      if (!this.matchesWatchFilter(item)) this.removeFilteredCard(card);
    }
    this.syncCollectionCard(item.collectionId);
  }

  async toggleWatched(item) {
    try {
      const watched = !item.watched;
      const releasedKeys = item.mediaType === "电影" ? new Set() : this.releasedSeasonKeys(item);
      const watchedKeys = item.mediaType === "电影" || !releasedKeys.size
        ? null
        : (watched ? releasedKeys : new Set());
      await this.plugin.updateFrontMatter(item.file, (frontmatter) => {
        frontmatter.watched = watched;
        if (watchedKeys) frontmatter.watched_seasons = sortedSeasonWatchKeys(watchedKeys);
      });
      item.watched = watched;
      if (watchedKeys) {
        item.watchedSeasonKeys = new Set(watchedKeys);
        item.watchedSeasons = sortedSeasonWatchKeys(watchedKeys);
      }
      this.syncItemWatchedUi(item);
      this.plugin.navigation.notifyItemChanged(item);
      return true;
    } catch (error) {
      console.error("Movie Wall: failed to update watched", error);
      new Notice("无法更新观看状态，请检查条目文件是否可写。");
      return false;
    }
  }

  async toggleSeasonWatched(item, season, special = false, index = 0) {
    if (!isReleasedSeason(season)) return false;
    const key = seasonWatchKey(season, special, index);
    if (!key) return false;
    try {
      const watchedKeys = this.effectiveWatchedSeasonKeys(item);
      if (watchedKeys.has(key)) watchedKeys.delete(key);
      else watchedKeys.add(key);
      const releasedKeys = this.releasedSeasonKeys(item);
      const watched = releasedKeys.size > 0
        ? [...releasedKeys].every((releasedKey) => watchedKeys.has(releasedKey))
        : item.watched;
      const stored = sortedSeasonWatchKeys(watchedKeys);
      await this.plugin.updateFrontMatter(item.file, (frontmatter) => {
        frontmatter.watched_seasons = stored;
        frontmatter.watched = watched;
      });
      item.watchedSeasonKeys = new Set(stored);
      item.watchedSeasons = stored;
      item.watched = watched;
      this.syncItemWatchedUi(item);
      this.plugin.navigation.notifyItemChanged(item);
      return true;
    } catch (error) {
      console.error("Movie Wall: failed to update season watched", error);
      new Notice("无法更新本季观看状态，请检查条目文件是否可写。");
      return false;
    }
  }
}

class MovieWallModal extends Modal {
  startMotion(...classes) {
    this.modalEl.classList.add(...classes);
    this.motionContainer = this.modalEl.closest(".modal-container") || this.modalEl.parentElement;
    if (!this.motionContainer) return;
    this.motionContainer.classList.add("movie-wall-modal-layer", "is-entering");
    afterLayout(() => {
      if (!this.motionContainer?.isConnected) return;
      this.motionContainer.classList.add("is-open");
      this.motionOpenTimer = window.setTimeout(() => {
        this.motionContainer?.classList.remove("is-entering");
        this.motionOpenTimer = null;
      }, 300);
    });
  }

  close(immediate = false) {
    if (this.motionClosing) return;
    const reduced = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    if (immediate || reduced || !this.motionContainer?.isConnected) {
      super.close();
      return;
    }
    this.motionClosing = true;
    if (this.motionOpenTimer) window.clearTimeout(this.motionOpenTimer);
    this.motionContainer.classList.remove("is-entering", "is-open");
    this.motionContainer.classList.add("is-closing");
    const finish = () => {
      if (!this.motionClosing) return;
      this.motionClosing = false;
      this.modalEl.removeEventListener("transitionend", onTransitionEnd);
      if (this.motionCloseTimer) window.clearTimeout(this.motionCloseTimer);
      this.motionCloseTimer = null;
      super.close();
    };
    const onTransitionEnd = (event) => {
      if (event.target === this.modalEl && event.propertyName === "opacity") finish();
    };
    this.modalEl.addEventListener("transitionend", onTransitionEnd);
    this.motionCloseTimer = window.setTimeout(finish, 230);
  }

  cleanupMotion() {
    if (this.motionOpenTimer) window.clearTimeout(this.motionOpenTimer);
    if (this.motionCloseTimer) window.clearTimeout(this.motionCloseTimer);
    this.motionOpenTimer = null;
    this.motionCloseTimer = null;
  }
}

class MovieDetailModal extends MovieWallModal {
  constructor(app, plugin, item, wall) {
    super(app);
    this.plugin = plugin;
    this.item = item;
    this.wall = wall;
  }

  onOpen() {
    this.startMotion("movie-wall-modal");
    this.render();
  }

  onClose() {
    this.cleanupMotion();
    this.plugin.navigation.modalClosed(this);
  }

  captureNavigationState() {
    return { type: "tv", id: this.item.file?.path || this.item.title, scrollTop: this.contentEl.scrollTop || 0 };
  }

  restoreNavigationState(state) {
    const scrollTop = Number(state?.scrollTop) || 0;
    this.syncItemState(this.item);
    afterLayout(() => { this.contentEl.scrollTop = scrollTop; });
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    const layout = el("div", "movie-wall-detail");
    layout.append(this.wall.posterNode(this.item, "movie-wall-detail-poster"));
    const info = el("div", "movie-wall-detail-info");
    info.append(el("h2", "", this.item.title));
    if (this.item.originalTitle && this.item.originalTitle !== this.item.title) info.append(el("div", "movie-wall-detail-original", this.item.originalTitle));
    if (this.item.mediaType !== "电影" && this.item.releasedSeasonCount) {
      const stats = this.wall.seasonStats(this.item);
      this.seriesSummaryEl = el("div", "movie-wall-series-summary", `${this.item.releasedSeasonCount}季${this.item.episodeCount ? ` · ${this.item.episodeCount}集` : ""} · 已看 ${stats.watched}/${stats.total}`);
      info.append(this.seriesSummaryEl);
    }
    const facts = el("dl", "movie-wall-facts");
    this.fact(facts, "年份", this.item.year);
    this.fact(facts, "评分", this.item.rating !== "" && this.item.rating != null ? `${this.item.ratingSource || "Imported / 导入"} ${this.item.rating}` : "待核验");
    this.factNode(facts, "分级", this.certificationNode());
    this.fact(facts, "类型", this.item.genres.length ? this.item.genres.join(" / ") : this.item.mediaType);
    this.fact(facts, "国家 / 地区", this.item.country.join(" / "));
    this.factNode(facts, "Netflix", this.netflixNode());
    this.fact(facts, "已发布季数", this.item.releasedSeasonCount ? `${this.item.releasedSeasonCount} 季` : "");
    if (this.item.releasedSeasonCount) {
      const stats = this.wall.seasonStats(this.item);
      const unit = this.item.partCount ? " Season / Part" : " 季";
      this.seasonProgressEl = el("span", "movie-wall-season-progress", `已看 ${stats.watched}/${stats.total}${unit}`);
      this.factNode(facts, "观看进度", this.seasonProgressEl);
    }
    this.fact(facts, "待播", this.item.upcomingSeasons.length ? this.item.upcomingSeasons.map((season) => season.label || `第${season.season}季`).join(" / ") : "");
    this.fact(facts, "总集数", this.item.episodeCount ? `${this.item.episodeCount} 集` : "");
    this.fact(facts, "状态", this.item.seriesStatus);
    info.append(facts);
    const tv = this.item.mediaType !== "电影";
    const watchedButton = el("button", "mod-cta movie-wall-detail-watch", this.item.watched
      ? (tv ? "✓ 全部已观看（点击取消）" : "✓ 已观看（点击取消）")
      : (tv ? "标记全部 Season 已观看" : "标记为已观看"));
    this.detailWatchedButton = watchedButton;
    watchedButton.addEventListener("click", async () => {
      if (watchedButton.disabled) return;
      watchedButton.disabled = true;
      await this.wall.toggleWatched(this.item);
      if (watchedButton.isConnected) watchedButton.disabled = false;
    });
    info.append(watchedButton);
    const noteButton = el("button", "movie-wall-open-note", "Open note / 打开笔记");
    noteButton.addEventListener("click", async () => { await this.app.workspace.getLeaf(true).openFile(this.item.file); this.close(); });
    info.append(noteButton);
    const ratingLabel = el("label", "movie-wall-personal-rating", "My rating / 个人评分 ");
    const rating = el("select", ""); rating.setAttribute("aria-label", "Personal rating / 个人评分");
    for (const n of ["", 0,1,2,3,4,5,6,7,8,9,10]) { const opt=el("option", "", n === "" ? "—" : n); opt.value=String(n); rating.append(opt); }
    rating.value = this.item.personalRating == null ? "" : String(this.item.personalRating);
    rating.addEventListener("change", async () => {
      rating.disabled = true;
      try { await this.plugin.updateFrontMatter(this.item.file, fm => { fm.personal_rating = rating.value === "" ? null : Number(rating.value); }); this.item.personalRating = rating.value === "" ? null : Number(rating.value); }
      catch (e) { new Notice("Rating save failed / 评分保存失败: " + e.message); }
      finally { rating.disabled = false; }
    }); ratingLabel.append(rating); info.append(ratingLabel);
    if (this.item.plot) {
      info.append(el("h3", "", "剧情简介"), el("p", "movie-wall-plot", this.item.plot));
    }
    if (this.item.seasons.length || this.item.upcomingSeasons.length || this.item.seasonDetails.length) {
      info.append(el("h3", "", "季"));
      const seasonList = el("div", "movie-wall-season-grid");
      const rows = [...this.item.seasons, ...this.item.upcomingSeasons];
      if (rows.length) {
        rows.forEach((season, index) => seasonList.append(this.seasonCard(season, false, index)));
      } else {
        for (const detail of this.item.seasonDetails) {
          seasonList.append(el("div", `movie-wall-season-row${detail.includes("待播") ? " is-upcoming" : ""}`, detail));
        }
      }
      info.append(seasonList);
    }
    if (this.item.specials.length) {
      info.append(el("h3", "", "特别篇 / OVA"));
      const specialList = el("div", "movie-wall-season-grid movie-wall-special-list");
      this.item.specials.forEach((special, index) => specialList.append(this.seasonCard(special, true, index)));
      info.append(specialList);
    }
    layout.append(info);
    contentEl.append(layout);
  }

  syncItemState(item) {
    if (item !== this.item && item.file?.path !== this.item.file?.path) return;
    const stats = this.wall.seasonStats(this.item);
    if (this.seriesSummaryEl) {
      this.seriesSummaryEl.textContent = `${this.item.releasedSeasonCount}季${this.item.episodeCount ? ` · ${this.item.episodeCount}集` : ""} · 已看 ${stats.watched}/${stats.total}`;
    }
    if (this.seasonProgressEl) {
      const unit = this.item.partCount ? " Season / Part" : " 季";
      this.seasonProgressEl.textContent = `已看 ${stats.watched}/${stats.total}${unit}`;
    }
    if (this.detailWatchedButton) {
      const tv = this.item.mediaType !== "电影";
      this.detailWatchedButton.textContent = this.item.watched
        ? (tv ? "✓ 全部已观看（点击取消）" : "✓ 已观看（点击取消）")
        : (tv ? "标记全部 Season 已观看" : "标记为已观看");
    }
    const watchedKeys = this.wall.effectiveWatchedSeasonKeys(this.item);
    for (const card of this.contentEl.querySelectorAll(".movie-wall-season-card[data-season-key]")) {
      const button = card.querySelector(".movie-wall-season-watched");
      if (button) this.setSeasonButtonState(button, watchedKeys.has(card.dataset.seasonKey));
    }
  }

  fact(list, label, value) {
    if (!value) return;
    list.append(el("dt", "", label), el("dd", "", value));
  }

  factNode(list, label, value) {
    if (!value) return;
    list.append(el("dt", "", label));
    const description = el("dd", "");
    description.append(value);
    list.append(description);
  }

  certificationNode() {
    const stack = el("div", "movie-wall-fact-stack");
    stack.append(el("div", "movie-wall-fact-main", this.item.certification || "分级信息不足"));
    const type = this.item.certificationType;
    const mapped = this.plugin.certificationMapping(this.item.certificationRegion, this.item.certificationOriginal);
    if (type === "inferred") {
      stack.append(el("div", "movie-wall-fact-secondary", "内容推定 · 非官方分级"));
      if (this.item.certificationReason.length) {
        stack.append(el("div", "movie-wall-fact-explanation", `主要原因：${this.item.certificationReason.join(" · ")}`));
      }
    } else if (type === "unrated") {
      stack.append(el("div", "movie-wall-fact-secondary", "资料明确标为未评级，并非未核验"));
      if (this.item.certificationRegion || this.item.certificationOriginal) {
        stack.append(el("div", "movie-wall-fact-explanation", [this.plugin.regionName(this.item.certificationRegion), this.item.certificationOriginal].filter(Boolean).join(" · ")));
      }
    } else if (type === "official") {
      const formal = [this.plugin.regionName(this.item.certificationRegion), this.item.certificationOriginal].filter(Boolean).join(" · ");
      if (formal) stack.append(el("div", "movie-wall-fact-secondary", formal));
      if (mapped?.full_zh) stack.append(el("div", "movie-wall-fact-explanation", mapped.full_zh));
    } else {
      stack.append(el("div", "movie-wall-fact-secondary", this.item.certificationSource && this.item.certificationChecked ? "现有来源信息不足以可靠推定" : "No verified source supplied / 未提供已核验来源"));
    }
    const sourceMeta = [];
    if (this.item.certificationSource) sourceMeta.push(`来源：${this.item.certificationSource}`);
    if (this.item.certificationChecked) sourceMeta.push(`核验：${this.item.certificationChecked}`);
    if (sourceMeta.length) stack.append(el("div", "movie-wall-fact-meta", sourceMeta.join(" · ")));
    return stack;
  }

  netflixNode() {
    const stack = el("div", "movie-wall-fact-stack movie-wall-netflix-detail");
    const regions = this.item.netflixRegions;
    let summary = "可用性未确认";
    if (this.item.netflix) summary = regions.length ? `可观看 · ${regions.length}个地区` : "可观看";
    else if (this.item.netflixStatus === "not_available") summary = "当前未发现可观看地区";
    stack.append(el("div", "movie-wall-fact-main", summary));

    const hasDetails = regions.length || this.item.netflixSource || this.item.netflixChecked;
    if (!hasDetails) return stack;
    const details = el("div", "movie-wall-fact-details");
    details.hidden = true;
    if (regions.length) {
      const names = regions.map((code) => this.plugin.regionName(code));
      details.append(el("div", "movie-wall-region-list", names.join("、")));
    }
    const meta = [];
    if (this.item.netflixSource) meta.push(`数据来源：${this.item.netflixSource}`);
    if (this.item.netflixChecked) meta.push(`检查日期：${this.item.netflixChecked}`);
    if (meta.length) details.append(el("div", "movie-wall-fact-meta", meta.join(" · ")));
    const toggle = el("button", "movie-wall-expand-toggle", regions.length ? "展开地区" : "查看核验信息");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      details.hidden = !details.hidden;
      toggle.setAttribute("aria-expanded", String(!details.hidden));
      toggle.textContent = details.hidden ? (regions.length ? "展开地区" : "查看核验信息") : "收起";
    });
    stack.append(toggle, details);
    return stack;
  }

  setSeasonButtonState(button, watched) {
    button.classList.toggle("is-watched", Boolean(watched));
    button.textContent = watched ? "✓" : "";
    button.setAttribute("aria-label", watched ? "标记本季为未观看" : "标记本季为已观看");
    button.title = watched ? "本季已观看，点击取消" : "标记本季为已观看";
  }

  seasonCard(season, special = false, index = 0) {
    const statusMap = { released: "已播", airing: "播出中", upcoming: "待播", unknown: "待核验" };
    const status = text(season.status, "unknown");
    const key = seasonWatchKey(season, special, index);
    const interactive = isReleasedSeason(season);
    const card = el("article", `movie-wall-season-card is-interactive${status === "upcoming" ? " is-upcoming" : ""}`);
    card.tabIndex = 0;
    card.dataset.seasonKey = key;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `打开${season.label || (special ? "特别篇" : `第${season.season}季`)}详情`);
    const posterItem = {
      title: season.label || this.item.title,
      poster: season.poster || this.item.poster,
      posterFit: "cover",
      posterPosition: "center center",
    };
    const poster = this.wall.posterNode(posterItem, "movie-wall-season-poster");
    if (interactive && key) {
      const watched = this.wall.isSeasonWatched(this.item, season, special, index);
      const watchedButton = el("button", `movie-wall-season-watched${watched ? " is-watched" : ""}`, watched ? "✓" : "");
      watchedButton.type = "button";
      this.setSeasonButtonState(watchedButton, watched);
      watchedButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        if (watchedButton.disabled) return;
        watchedButton.disabled = true;
        await this.wall.toggleSeasonWatched(this.item, season, special, index);
        if (watchedButton.isConnected) watchedButton.disabled = false;
      });
      poster.append(watchedButton);
    }
    poster.append(el("span", "movie-wall-season-status-badge", statusMap[status] || status));
    card.append(poster);
    const info = el("div", "movie-wall-season-info");
    info.append(el("div", "movie-wall-season-label", season.label || (special ? "特别篇" : `第${season.season}季`)));
    const original = season.original_label || (special ? text(season.label, "Specials") : `Season ${season.season}${season.part ? ` Part ${season.part}` : ""}`);
    if (original) info.append(el("div", "movie-wall-season-original", original));
    const episodes = Number(season.episodes) > 0 ? `${season.episodes}集` : (status === "upcoming" ? "集数未公布" : "集数未确认");
    const year = season.year || text(season.air_date).slice(0, 4);
    info.append(el("div", "movie-wall-season-meta", [episodes, year].filter(Boolean).join(" · ")));
    card.append(info);
    const open = () => this.plugin.navigation.openSeason(this.wall, this.item, season, this, { special, index });
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      open();
    });
    return card;
  }
}

class SeasonDetailModal extends MovieWallModal {
  constructor(app, plugin, item, season, wall, parent, options = {}) {
    super(app);
    this.plugin = plugin;
    this.item = item;
    this.season = season;
    this.wall = wall;
    this.parent = parent;
    this.special = Boolean(options.special);
    this.index = Number(options.index) || 0;
    this.key = seasonWatchKey(season, this.special, this.index);
  }

  onOpen() {
    this.startMotion("movie-wall-modal", "movie-wall-season-modal");
    this.render();
  }

  onClose() {
    this.cleanupMotion();
    this.plugin.navigation.modalClosed(this);
  }

  captureNavigationState() {
    return { type: "season", id: this.key, scrollTop: this.contentEl.scrollTop || 0 };
  }

  restoreNavigationState(state) {
    const scrollTop = Number(state?.scrollTop) || 0;
    this.syncItemState(this.item);
    afterLayout(() => { this.contentEl.scrollTop = scrollTop; });
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    const label = this.season.label || (this.special ? "特别篇" : `第${this.season.season}季`);
    const original = this.season.original_label || (this.special ? "Specials" : `Season ${this.season.season}${this.season.part ? ` Part ${this.season.part}` : ""}`);
    const layout = el("div", "movie-wall-detail movie-wall-season-detail");
    layout.append(this.wall.posterNode({
      title: `${this.item.title} ${label}`,
      poster: this.season.poster || this.item.poster,
      posterFit: "cover",
      posterPosition: "center center",
    }, "movie-wall-detail-poster movie-wall-season-detail-poster"));
    const info = el("div", "movie-wall-detail-info");
    info.append(el("div", "movie-wall-season-parent-title", this.item.title), el("h2", "", label));
    if (original) info.append(el("div", "movie-wall-detail-original", original));
    const facts = el("dl", "movie-wall-facts");
    if (!this.special) this.fact(facts, "Season", this.season.season ? `S${this.season.season}` : "");
    this.fact(facts, "Part", this.season.part ? `Part ${this.season.part}` : "");
    this.fact(facts, "年份", this.season.year || text(this.season.air_date).slice(0, 4));
    this.fact(facts, "首播", this.season.air_date);
    this.fact(facts, "集数", Number(this.season.episodes) > 0 ? `${this.season.episodes} 集` : "");
    const statusMap = { released: "已播", airing: "播出中", upcoming: "待播", unknown: "待核验" };
    this.fact(facts, "播出状态", statusMap[text(this.season.status, "unknown")] || text(this.season.status));
    this.watchedStatusEl = el("span", "movie-wall-season-detail-status");
    this.factNode(facts, "观看状态", this.watchedStatusEl);
    info.append(facts);
    if (isReleasedSeason(this.season) && this.key) {
      this.watchedButton = el("button", "mod-cta movie-wall-detail-watch movie-wall-season-detail-watch");
      this.watchedButton.addEventListener("click", async () => {
        if (this.watchedButton.disabled) return;
        this.watchedButton.disabled = true;
        await this.wall.toggleSeasonWatched(this.item, this.season, this.special, this.index);
        if (this.watchedButton.isConnected) this.watchedButton.disabled = false;
      });
      info.append(this.watchedButton);
    }
    const overview = text(this.season.overview || this.season.plot).trim();
    if (overview) info.append(el("h3", "", "本季简介"), el("p", "movie-wall-plot", overview));
    layout.append(info);
    contentEl.append(layout);
    this.syncItemState(this.item);
  }

  fact(list, label, value) {
    if (!value) return;
    list.append(el("dt", "", label), el("dd", "", value));
  }

  factNode(list, label, value) {
    if (!value) return;
    list.append(el("dt", "", label));
    const description = el("dd", "");
    description.append(value);
    list.append(description);
  }

  syncItemState(item) {
    if (item !== this.item && item.file?.path !== this.item.file?.path) return;
    const watched = this.wall.isSeasonWatched(this.item, this.season, this.special, this.index);
    if (this.watchedStatusEl) {
      this.watchedStatusEl.textContent = watched ? "✓ 已观看" : "未观看";
      this.watchedStatusEl.classList.toggle("is-watched", watched);
    }
    if (this.watchedButton) this.watchedButton.textContent = watched ? "标记本季为未观看" : "标记本季为已观看";
  }
}

class CollectionModal extends MovieWallModal {
  constructor(app, plugin, collection, wall) {
    super(app);
    this.plugin = plugin;
    this.collection = collection;
    this.wall = wall;
    this.selectedItems = new Map();
    this.selectionToolbarEl = null;
    this.deletingSelection = false;
  }

  onOpen() {
    this.startMotion("movie-wall-modal", "movie-wall-collection-modal");
    this.render();
  }

  onClose() {
    this.cleanupMotion();
    this.plugin.navigation.modalClosed(this);
  }

  captureNavigationState() {
    return { type: "collection", id: this.collection.id, scrollTop: this.contentEl.scrollTop || 0 };
  }

  restoreNavigationState(state) {
    const scrollTop = Number(state?.scrollTop) || 0;
    this.syncSummary();
    afterLayout(() => { this.contentEl.scrollTop = scrollTop; });
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.append(this.createSelectionToolbar());
    contentEl.append(el("h2", "", this.collection.title));
    if (this.collection.originalTitle) contentEl.append(el("div", "movie-wall-detail-original", this.collection.originalTitle));
    const stats = this.wall.collectionStats(this.collection);
    const total = stats.total;
    const netflix = this.collection.members.filter((x) => x.netflix).length;
    const progress = stats.completed ? `✓ 已全部观看 ${stats.watched}/${total}` : `已观看 ${stats.watched}/${total}`;
    this.summaryEl = el("div", `movie-wall-collection-summary${stats.completed ? " is-complete" : ""}`, `${total} 部作品　${progress}　Netflix ${netflix}/${total}`);
    contentEl.append(this.summaryEl);
    const grid = el("div", "movie-wall-grid movie-wall-collection-grid");
    for (const item of this.collection.members) {
      const card = this.wall.movieCard(item, (changed) => this.syncItemState(changed), this);
      grid.append(card);
    }
    contentEl.append(grid);
    this.updateSelectionUi();
  }

  selectionActive() { return this.selectedItems.size > 0; }

  createSelectionToolbar() {
    const toolbar = el("div", "movie-wall-selection-toolbar is-modal-selection");
    toolbar.setAttribute("role", "toolbar");
    const cancel = el("button", "movie-wall-selection-cancel", "取消");
    cancel.type = "button";
    cancel.addEventListener("click", () => this.cancelSelection());
    const count = el("div", "movie-wall-selection-count", "已选择 0 项");
    const remove = el("button", "movie-wall-selection-delete");
    remove.type = "button";
    setIcon(remove, "trash-2");
    remove.append(el("span", "", "删除"));
    remove.addEventListener("click", () => this.deleteSelection());
    toolbar.append(cancel, count, remove);
    this.selectionToolbarEl = toolbar;
    return toolbar;
  }

  updateSelectionUi() {
    const active = this.selectionActive();
    this.contentEl.classList.toggle("is-selecting", active);
    if (this.selectionToolbarEl) {
      this.selectionToolbarEl.classList.toggle("is-visible", active);
      const count = this.selectionToolbarEl.querySelector(".movie-wall-selection-count");
      if (count) count.textContent = `已选择 ${this.selectedItems.size} 项`;
      const remove = this.selectionToolbarEl.querySelector(".movie-wall-selection-delete");
      if (remove) remove.disabled = !active || this.deletingSelection;
    }
    for (const card of this.contentEl.querySelectorAll(".movie-wall-card[data-item-path]")) {
      const selected = this.selectedItems.has(card.dataset.itemPath);
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-selected", String(selected));
    }
  }

  toggleSelection(item, force = null) {
    const key = stableItemKey(item);
    const shouldSelect = force === null ? !this.selectedItems.has(key) : Boolean(force);
    if (shouldSelect) this.selectedItems.set(key, item);
    else this.selectedItems.delete(key);
    this.updateSelectionUi();
  }

  cancelSelection() {
    this.selectedItems.clear();
    this.updateSelectionUi();
  }

  async deleteSelection() {
    if (!this.selectedItems.size || this.deletingSelection) return;
    const selected = [...this.selectedItems.values()];
    const confirmed = await DeleteConfirmModal.confirm(this.app, selected);
    if (!confirmed) return;
    this.deletingSelection = true;
    this.updateSelectionUi();
    try {
      const result = await this.plugin.deleteItems(selected);
      const deleted = new Set(result.deletedPaths || []);
      this.collection.members = this.collection.members.filter((item) => !deleted.has(stableItemKey(item)));
      for (const card of this.contentEl.querySelectorAll(".movie-wall-card[data-item-path]")) {
        if (!deleted.has(card.dataset.itemPath)) continue;
        card.classList.add("is-removing");
        window.setTimeout(() => card.remove(), 180);
      }
      this.wall.applyDeletionResult(result);
      this.cancelSelection();
      this.syncSummary();
      new Notice(`已将 ${selected.length} 个条目移至系统回收站。`);
      if (this.collection.members.length < 2) window.setTimeout(() => this.close(), 210);
    } catch (_) {
      // deleteItems has already rolled back and reported the error.
    } finally {
      this.deletingSelection = false;
      this.updateSelectionUi();
    }
  }

  syncSummary() {
    if (!this.summaryEl) return;
    const stats = this.wall.collectionStats(this.collection);
    const netflix = this.collection.members.filter((item) => item.netflix).length;
    const progress = stats.completed ? `✓ 已全部观看 ${stats.watched}/${stats.total}` : `已观看 ${stats.watched}/${stats.total}`;
    this.summaryEl.textContent = `${stats.total} 部作品　${progress}　Netflix ${netflix}/${stats.total}`;
    this.summaryEl.classList.toggle("is-complete", stats.completed);
  }

  syncItemState(item) {
    const path = item.file?.path || item.title;
    for (const card of this.contentEl.querySelectorAll(".movie-wall-card[data-item-path]")) {
      if (card.dataset.itemPath !== path) continue;
      const button = card.querySelector(".movie-wall-watched:not(.movie-wall-collection-watched)");
      if (button) this.wall.setWatchedButtonState(button, item.watched);
    }
    this.syncSummary();
  }
}

class DeleteConfirmModal extends MovieWallModal {
  static confirm(app, items) {
    return new Promise((resolve) => new DeleteConfirmModal(app, items, resolve).open());
  }

  constructor(app, items, resolve) {
    super(app);
    this.items = items;
    this.resolve = resolve;
    this.resolved = false;
  }

  onOpen() {
    this.startMotion("movie-wall-confirm-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.append(el("h2", "", `删除 ${this.items.length} 个条目？`));
    contentEl.append(el("p", "movie-wall-confirm-copy", "条目 Markdown 将进入系统回收站；只有没有被其他作品引用的海报才会一并移入回收站。"));
    const list = el("ul", "movie-wall-delete-title-list");
    for (const item of this.items) list.append(el("li", "", item.title));
    contentEl.append(list);
    const actions = el("div", "movie-wall-confirm-actions");
    const cancel = el("button", "", "取消");
    cancel.type = "button";
    cancel.addEventListener("click", () => this.finish(false));
    const confirm = el("button", "mod-warning movie-wall-confirm-delete");
    confirm.type = "button";
    setIcon(confirm, "trash-2");
    confirm.append(el("span", "", "移至回收站"));
    confirm.addEventListener("click", () => this.finish(true));
    actions.append(cancel, confirm);
    contentEl.append(actions);
  }

  finish(value) {
    if (!this.resolved) {
      this.resolved = true;
      this.resolve(Boolean(value));
    }
    this.close();
  }

  onClose() {
    this.cleanupMotion();
    if (!this.resolved) {
      this.resolved = true;
      this.resolve(false);
    }
    this.contentEl.empty();
  }
}

class CollectionManagementModal extends MovieWallModal {
  constructor(app, plugin, collection, wall) {
    super(app);
    this.plugin = plugin;
    this.collection = collection;
    this.wall = wall;
    this.armed = false;
    this.armTimer = null;
  }

  onOpen() {
    this.startMotion("movie-wall-confirm-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.append(el("h2", "", this.collection.title));
    contentEl.append(el("p", "movie-wall-confirm-copy", "合集管理只会解除成员之间的合集关系，不会删除任何影视条目、海报或观看数据。"));
    const dissolve = el("button", "mod-warning movie-wall-dissolve-button", "解散合集");
    dissolve.type = "button";
    dissolve.addEventListener("click", async () => {
      if (!this.armed) {
        this.armed = true;
        dissolve.textContent = "再次点击确认解散";
        this.armTimer = window.setTimeout(() => {
          this.armed = false;
          if (dissolve.isConnected) dissolve.textContent = "解散合集";
        }, 3500);
        return;
      }
      dissolve.disabled = true;
      try {
        await this.plugin.dissolveCollection(this.collection);
        this.wall.applyDissolveResult(this.collection);
        new Notice(`已解散合集「${this.collection.title}」，没有删除作品。`);
        this.close();
      } catch (_) {
        dissolve.disabled = false;
      }
    });
    contentEl.append(dissolve);
  }

  onClose() {
    if (this.armTimer) window.clearTimeout(this.armTimer);
    this.cleanupMotion();
    this.contentEl.empty();
  }
}

module.exports = MovieWallPlugin;
module.exports.__test = {
  MovieWallNavigation,
  MovieWallView,
  MovieWallModal,
  MovieDetailModal,
  SeasonDetailModal,
  CollectionModal,
  DeleteConfirmModal,
  CollectionManagementModal,
  normalizeSeasonWatchKey,
  seasonWatchKey,
  seasonWatchKeys,
  objectList,
  numberList,
};
