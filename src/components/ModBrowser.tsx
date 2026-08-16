import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type {
  ModDownloadPlanItem,
  ModDownloadSelection,
  ModSearchResult,
  ModSort,
  ModSource,
  ModVersionInfo,
} from "../lib/types";
import { Icon } from "./Icon";
import { ModDownloadConfirmModal } from "./ModDownloadConfirmModal";
import { Select } from "./Select";
import { Tabs } from "./Tabs";
import { useLauncherStore } from "../store/launcherStore";

const MODRINTH_SORTS: { value: ModSort; label: string }[] = [
  { value: "downloads", label: "Top downloads" },
  { value: "newest", label: "Newest" },
  { value: "updated", label: "Recently updated" },
  { value: "relevance", label: "Relevance" },
];

const CURSEFORGE_SORTS: { value: ModSort; label: string }[] = [
  { value: "downloads", label: "Top downloads" },
  { value: "popularity", label: "Popularity" },
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name" },
];

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function selectionKey(selection: ModDownloadSelection) {
  return `${selection.source}-${selection.modId}-${selection.versionId}`;
}

function toSelection(
  mod: ModSearchResult,
  version: ModVersionInfo,
): ModDownloadSelection | null {
  const file = version.files[0];
  if (!file?.downloadUrl) return null;
  return {
    modId: mod.id,
    versionId: version.id,
    source: mod.source,
    title: mod.title,
    versionName: version.name,
    filename: file.filename,
    downloadUrl: file.downloadUrl,
    sizeBytes: file.sizeBytes,
  };
}

export function ModBrowser() {
  const profileId = useLauncherStore((s) => s.selectedProfileId);
  const installedMods = useLauncherStore((s) => s.installedMods);
  const modBrowseResults = useLauncherStore((s) => s.modBrowseResults);
  const modBrowseHasMore = useLauncherStore((s) => s.modBrowseHasMore);
  const modBrowseTotal = useLauncherStore((s) => s.modBrowseTotal);
  const modBrowseLoading = useLauncherStore((s) => s.modBrowseLoading);
  const browseMods = useLauncherStore((s) => s.browseMods);
  const loadInstalledMods = useLauncherStore((s) => s.loadInstalledMods);
  const installModFile = useLauncherStore((s) => s.installModFile);
  const planModDownloads = useLauncherStore((s) => s.planModDownloads);
  const installModsBatch = useLauncherStore((s) => s.installModsBatch);
  const removeModFile = useLauncherStore((s) => s.removeModFile);
  const openModsFolder = useLauncherStore((s) => s.openModsFolder);
  const busyAction = useLauncherStore((s) => s.busyAction);
  const error = useLauncherStore((s) => s.error);

  const [source, setSource] = useState<ModSource>("modrinth");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ModSort>("downloads");
  const [installedOpen, setInstalledOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<ModVersionInfo[]>([]);
  const [versionsCache, setVersionsCache] = useState<
    Record<string, ModVersionInfo[]>
  >({});
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [curseforgeReady, setCurseforgeReady] = useState(true);
  const [selectedMods, setSelectedMods] = useState<
    Record<string, ModDownloadSelection>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloadPlan, setDownloadPlan] = useState<ModDownloadPlanItem[]>([]);
  const [planLoading, setPlanLoading] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query);

  const sortOptions =
    source === "modrinth" ? MODRINTH_SORTS : CURSEFORGE_SORTS;

  const selectedCount = Object.keys(selectedMods).length;

  useEffect(() => {
    api.curseforgeAvailable().then(setCurseforgeReady).catch(() => setCurseforgeReady(false));
  }, []);

  useEffect(() => {
    if (profileId) loadInstalledMods();
  }, [profileId, loadInstalledMods]);

  useEffect(() => {
    const valid = sortOptions.some((o) => o.value === sort);
    if (!valid) setSort("downloads");
  }, [source, sort, sortOptions]);

  useEffect(() => {
    if (!profileId) return;
    browseMods(debouncedQuery, source, sort, false);
  }, [profileId, debouncedQuery, source, sort, browseMods]);

  const loadMore = useCallback(() => {
    if (!modBrowseLoading && modBrowseHasMore) {
      browseMods(debouncedQuery, source, sort, true);
    }
  }, [
    browseMods,
    debouncedQuery,
    source,
    sort,
    modBrowseLoading,
    modBrowseHasMore,
  ]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) loadMore();
  };

  const fetchVersionsForMod = async (modId: string, modSource: string) => {
    if (!profileId) return [];
    const cacheKey = `${modSource}-${modId}`;
    if (versionsCache[cacheKey]) return versionsCache[cacheKey];

    const v = await api.getModVersions(profileId, modId, modSource as ModSource);
    setVersionsCache((prev) => ({ ...prev, [cacheKey]: v }));
    return v;
  };

  const loadVersions = async (modId: string, modSource: string) => {
    if (expandedId === modId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(modId);
    setLoadingVersions(true);
    try {
      const v = await fetchVersionsForMod(modId, modSource);
      setVersions(v);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const isModInSelection = (modId: string, modSource: string) =>
    Object.values(selectedMods).some(
      (s) => s.modId === modId && s.source === modSource,
    );

  const isVersionSelected = (selection: ModDownloadSelection) =>
    Boolean(selectedMods[selectionKey(selection)]);

  const toggleVersionSelection = (mod: ModSearchResult, version: ModVersionInfo) => {
    const selection = toSelection(mod, version);
    if (!selection || version.installed) return;

    const key = selectionKey(selection);
    setSelectedMods((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        for (const [k, v] of Object.entries(next)) {
          if (v.modId === mod.id && v.source === mod.source) {
            delete next[k];
          }
        }
        next[key] = selection;
      }
      return next;
    });
  };

  const toggleModSelection = async (mod: ModSearchResult) => {
    if (isModInSelection(mod.id, mod.source)) {
      setSelectedMods((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(next)) {
          if (value.modId === mod.id && value.source === mod.source) {
            delete next[key];
          }
        }
        return next;
      });
      return;
    }

    try {
      const modVersions = await fetchVersionsForMod(mod.id, mod.source);
      const pick =
        modVersions.find((v) => !v.installed && v.files[0]?.downloadUrl) ??
        modVersions.find((v) => v.files[0]?.downloadUrl);
      if (!pick) return;
      const selection = toSelection(mod, pick);
      if (!selection) return;
      setSelectedMods((prev) => ({
        ...prev,
        [selectionKey(selection)]: selection,
      }));
    } catch {
    }
  };

  const clearSelection = () => {
    setSelectedMods({});
    setDownloadPlan([]);
  };

  const openDownloadConfirm = async () => {
    const selections = Object.values(selectedMods);
    if (selections.length === 0) return;

    setConfirmOpen(true);
    setPlanLoading(true);
    setDownloadPlan([]);
    try {
      const plan = await planModDownloads(selections);
      setDownloadPlan(plan);
    } finally {
      setPlanLoading(false);
    }
  };

  const confirmDownload = async () => {
    const count = await installModsBatch(downloadPlan);
    if (count > 0) {
      clearSelection();
    }
    setConfirmOpen(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDownloads = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="mod-browser mod-browser-unified">
      <div className="mod-browser-toolbar">
        <Tabs
          tabs={[
            { id: "modrinth", label: "Modrinth" },
            { id: "curseforge", label: "CurseForge" },
          ]}
          active={source}
          onChange={(id) => setSource(id as ModSource)}
          pillId="mod-source-tabs"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search mods…"
          className="mod-search-input"
        />
        <div className="mod-browser-toolbar-actions">
          <Select
            value={sort}
            onChange={(v) => setSort(v as ModSort)}
            options={sortOptions}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm mod-folder-btn"
            onClick={() => void openModsFolder()}
          >
            <Icon name="folder" size={14} />
            Mods folder
          </button>
        </div>
      </div>

      {source === "curseforge" && (error || !curseforgeReady) && (
        <p className="field-hint mod-cf-hint">
          {error && error.toLowerCase().includes("curseforge")
            ? error
            : !curseforgeReady
              ? "CurseForge search needs an API key. Add one in Settings → Data, or use Modrinth."
              : error}
        </p>
      )}

      <button
        type="button"
        className="installed-collapse-toggle"
        onClick={() => setInstalledOpen(!installedOpen)}
        aria-expanded={installedOpen}
      >
        <span>Installed mods ({installedMods.length})</span>
        <motion.span
          className="installed-collapse-chevron"
          animate={{ rotate: installedOpen ? 180 : 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <Icon name="chevron-down" size={14} />
        </motion.span>
      </button>
      <div className={`installed-mod-collapse${installedOpen ? " is-open" : ""}`}>
        <div className="installed-mod-collapse-inner">
          <div className="installed-mod-list compact">
            {installedMods.length === 0 ? (
              <p className="meta-line">No mods installed yet.</p>
            ) : (
              installedMods.map((m) => (
                <div key={m.filename} className="installed-mod-item">
                  <span className="installed-mod-name">{m.filename}</span>
                  <span className="meta-line">{formatSize(m.sizeBytes)}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busyAction === "remove-mod"}
                    onClick={() => removeModFile(m.filename)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mod-browse-meta">
        <span>
          {modBrowseLoading && modBrowseResults.length === 0
            ? "Loading…"
            : `${modBrowseResults.length} of ${modBrowseTotal} mods`}
        </span>
        {debouncedQuery && (
          <span className="meta-line">Search: &quot;{debouncedQuery}&quot;</span>
        )}
        {selectedCount > 0 && (
          <span className="mod-selection-count">{selectedCount} selected</span>
        )}
      </div>

      <div
        className="mod-browse-list"
        ref={listRef}
        onScroll={handleScroll}
      >
        {modBrowseResults.length === 0 && !modBrowseLoading && (
          <p className="meta-line mod-empty">
            {source === "curseforge" && error
              ? error
              : "No mods found. Try another filter."}
          </p>
        )}

        {modBrowseResults.map((mod) => (
          <div
            key={`${mod.source}-${mod.id}`}
            className={`mod-result-card panel${mod.installed ? " installed" : ""}${
              isModInSelection(mod.id, mod.source) ? " selected" : ""
            }`}
          >
            <div className="mod-result-row">
              <label className="mod-select-checkbox">
                <input
                  type="checkbox"
                  checked={isModInSelection(mod.id, mod.source)}
                  onChange={() => toggleModSelection(mod)}
                />
                <span className="mod-select-box" />
              </label>
              <button
                type="button"
                className="mod-result-main"
                onClick={() => loadVersions(mod.id, mod.source)}
              >
                {mod.iconUrl ? (
                  <img src={mod.iconUrl} alt="" className="mod-icon" />
                ) : (
                  <div className="mod-icon mod-icon-placeholder" />
                )}
                <div className="mod-result-info">
                  <strong>{mod.title}</strong>
                  <p className="meta-line">
                    {mod.author} · {formatDownloads(mod.downloads)} downloads
                  </p>
                  <p className="mod-desc">{mod.description.slice(0, 140)}</p>
                </div>
                {mod.installed && <span className="tag success">Installed</span>}
                <Icon
                  name="chevron-down"
                  size={14}
                  className={expandedId === mod.id ? "open" : ""}
                />
              </button>
            </div>
            {expandedId === mod.id && (
              <div className="mod-versions">
                {loadingVersions ? (
                  <p className="meta-line">Loading versions…</p>
                ) : versions.length === 0 ? (
                  <p className="meta-line">No compatible versions.</p>
                ) : (
                  versions.map((v) => {
                    const selection = toSelection(mod, v);
                    const checked =
                      selection ? isVersionSelected(selection) : false;
                    return (
                      <div
                        key={v.id}
                        className={`mod-version-row${v.installed ? " installed" : ""}${
                          checked ? " selected" : ""
                        }`}
                      >
                        <label className="mod-version-select">
                          <input
                            type="checkbox"
                            disabled={v.installed || !selection}
                            checked={checked}
                            onChange={() => toggleVersionSelection(mod, v)}
                          />
                          <span className="mod-select-box" />
                          <span>{v.name}</span>
                        </label>
                        {v.files[0] && (
                          <div className="mod-version-actions">
                            <span className="meta-line">
                              {formatSize(v.files[0].sizeBytes)}
                            </span>
                            {v.installed ? (
                              <span className="tag success tag-sm">Installed</span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={busyAction === "install-mod"}
                                onClick={() =>
                                  installModFile(
                                    v.files[0].downloadUrl,
                                    v.files[0].filename,
                                  )
                                }
                              >
                                Install now
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ))}

        {modBrowseLoading && modBrowseResults.length > 0 && (
          <div className="mod-load-more">
            <div className="spinner small" />
            <span>Loading more…</span>
          </div>
        )}
        {!modBrowseLoading && modBrowseHasMore && modBrowseResults.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm mod-load-btn" onClick={loadMore}>
            Load more
          </button>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="mod-selection-bar">
          <span>{selectedCount} mod(s) selected</span>
          <div className="mod-selection-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearSelection}
            >
              Clear selection
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busyAction === "install-mod"}
              onClick={openDownloadConfirm}
            >
              Download all
            </button>
          </div>
        </div>
      )}

      <ModDownloadConfirmModal
        open={confirmOpen}
        plan={downloadPlan}
        loading={planLoading}
        onConfirm={confirmDownload}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
