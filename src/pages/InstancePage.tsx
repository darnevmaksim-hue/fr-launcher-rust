import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../components/Icon";
import { ModBrowser } from "../components/ModBrowser";
import { Modal } from "../components/Modal";
import { Tabs } from "../components/Tabs";
import { HorizonConfigPanel } from "../components/HorizonConfigPanel";
import { NumberStepper } from "../components/NumberStepper";
import { Select } from "../components/Select";
import { formatLastPlayed, formatLoader, formatPlayTime } from "../lib/format";
import { useLauncherStore } from "../store/launcherStore";

const INSTANCE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "mods", label: "Mods" },
  { id: "horizon", label: "HorizonUI" },
  { id: "settings", label: "Settings" },
];

export function InstancePage() {
  const {
    profiles,
    selectedProfileId,
    setPage,
    installSelected,
    launchSelected,
    killGame,
    deleteProfile,
    updateProfile,
    openInstanceFolder,
    openModsFolder,
    busyAction,
    gameRunning,
    launchLogs,
    syncLaunchLogsFromFile,
    page,
    javaInstallations,
    javaLoading,
    loadJavaInstallations,
    supportedVersions,
  } = useLauncherStore();

  const [tab, setTab] = useState("overview");
  const [nameEdit, setNameEdit] = useState("");
  const [categoryEdit, setCategoryEdit] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [ramEdit, setRamEdit] = useState(4096);
  const [javaEdit, setJavaEdit] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const profile = profiles.find((p) => p.id === selectedProfileId);

  const existingCategories = useMemo(() => {
    const set = new Set(profiles.map((p) => p.category || "General"));
    return Array.from(set).sort();
  }, [profiles]);

  useEffect(() => {
    if (!profile) return;
    setNameEdit(profile.name);
    setCategoryEdit(profile.category || "General");
    setNewCategory("");
    setRamEdit(profile.ramMb);
    setJavaEdit(profile.javaPath ?? "");
    setConfirmDelete(false);
  }, [profile?.id, profile?.name, profile?.category, profile?.ramMb, profile?.javaPath]);

  useEffect(() => {
    if (tab === "settings") void loadJavaInstallations();
  }, [tab, loadJavaInstallations]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [launchLogs.length]);

  useEffect(() => {
    if (page !== "instance" || !selectedProfileId || tab !== "overview") return;

    void syncLaunchLogsFromFile();

    if (!gameRunning) return;

    const interval = setInterval(() => {
      void syncLaunchLogsFromFile();
    }, 1000);

    return () => clearInterval(interval);
  }, [page, selectedProfileId, tab, gameRunning, syncLaunchLogsFromFile]);

  const playBlocked =
    !profile?.installed ||
    busyAction === "install" ||
    busyAction === "launch" ||
    gameRunning;

  if (!profile) {
    return (
      <div className="page-empty">
        <p>Select an instance from the library.</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPage("play")}>
          Back to instances
        </button>
      </div>
    );
  }

  const requiredJava =
    supportedVersions.find((v) => v.version === profile.mcVersion)?.java ?? 21;
  const javaOptions = [
    { value: "", label: `Auto-detect (Java ${requiredJava}+)` },
    ...javaInstallations.map((j) => ({
      value: j.path,
      label: `Java ${j.version} — ${j.path}`,
    })),
  ];
  if (javaEdit && !javaOptions.some((o) => o.value === javaEdit)) {
    javaOptions.push({ value: javaEdit, label: javaEdit });
  }
  const finalCategory =
    categoryEdit === "__new__"
      ? newCategory.trim() || "General"
      : categoryEdit.trim() || "General";
  const dirty =
    nameEdit.trim() !== profile.name ||
    finalCategory !== (profile.category || "General") ||
    ramEdit !== profile.ramMb ||
    (javaEdit || "") !== (profile.javaPath ?? "");

  const saveSettings = () => {
    if (!nameEdit.trim()) return;
    void updateProfile({
      ...profile,
      name: nameEdit.trim(),
      category: finalCategory,
      ramMb: ramEdit,
      javaPath: javaEdit || null,
    });
  };

  return (
    <div className="instance-page">
      <div className="instance-page-header">
        <button type="button" className="btn btn-ghost btn-sm instance-back" onClick={() => setPage("play")}>
          <Icon name="chevron-left" size={14} />
          Library
        </button>
        <div className="instance-title-block">
          <h2>{profile.name}</h2>
          <div className="tag-row">
            <span className="tag">{profile.mcVersion}</span>
            <span className="tag">{formatLoader(profile.loader)}</span>
            <span className="tag">{profile.category || "General"}</span>
            <span className={`tag ${profile.installed ? "success" : "warn"}`}>
              {profile.installed ? "Ready" : "Not installed"}
            </span>
            {gameRunning && <span className="tag success">Running</span>}
          </div>
        </div>
        <div className="instance-header-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => openInstanceFolder()}
          >
            <Icon name="folder" size={14} />
            Folder
          </button>
          {gameRunning ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => killGame()}>
              Kill
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-play btn-sm"
              disabled={playBlocked}
              onClick={() => void launchSelected()}
            >
              <Icon name="play" size={12} />
              {busyAction === "launch" ? "Launching…" : "Play"}
            </button>
          )}
        </div>
      </div>

      <Tabs tabs={INSTANCE_TABS} active={tab} onChange={setTab} pillId="instance-tabs" />

      <div className={`panel instance-tab-panel instance-tab-${tab}`}>
        {tab === "overview" && (
          <div className="instance-overview">
            <div className="instance-stat-grid">
              <div className="instance-stat-card">
                <span>Memory</span>
                <strong>{profile.ramMb} MB</strong>
              </div>
              <div className="instance-stat-card">
                <span>Last played</span>
                <strong>{formatLastPlayed(profile.lastPlayed)}</strong>
              </div>
              <div className="instance-stat-card">
                <span>Play time</span>
                <strong>{formatPlayTime(profile.playTimeMs)}</strong>
              </div>
              <div className="instance-stat-card">
                <span>Created</span>
                <strong>{new Date(profile.createdAt).toLocaleDateString()}</strong>
              </div>
            </div>

            <div className="instance-overview-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busyAction !== null || gameRunning}
                onClick={() => installSelected()}
              >
                {busyAction === "install"
                  ? "Installing…"
                  : profile.installed
                    ? "Reinstall"
                    : "Install"}
              </button>
              {gameRunning && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => killGame()}>
                  Kill game
                </button>
              )}
            </div>

            <div className="game-log-panel">
              <div className="install-log-header">
                <span>Launch log</span>
                <span className="install-log-count">{launchLogs.length} lines</span>
              </div>
              <div className="install-log-scroll">
                {launchLogs.length === 0 ? (
                  <p className="install-log-empty">
                    {gameRunning
                      ? "Waiting for game output…"
                      : "Launch the instance to see live logs here."}
                  </p>
                ) : (
                  launchLogs.map((entry, i) => (
                    <div key={i} className={`install-log-line level-${entry.level}`}>
                      {entry.message}
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        )}

        {tab === "mods" && <ModBrowser />}

        {tab === "horizon" && <HorizonConfigPanel />}

        {tab === "settings" && (
          <div className="instance-settings">
            <div className="instance-settings-grid">
              <div className="instance-settings-card">
                <div className="instance-settings-card-head">
                  <span className="instance-settings-card-icon">
                    <Icon name="edit" size={16} />
                  </span>
                  <div>
                    <h3>Identity</h3>
                    <p>Name and category.</p>
                  </div>
                </div>
                <div className="field">
                  <label>Instance name</label>
                  <input
                    value={nameEdit}
                    onChange={(e) => setNameEdit(e.target.value)}
                    placeholder="My HorizonUI"
                    maxLength={48}
                  />
                </div>
                <div className="field">
                  <label>Category</label>
                  <Select
                    value={categoryEdit}
                    onChange={setCategoryEdit}
                    options={[
                      ...existingCategories.map((c) => ({ value: c, label: c })),
                      ...(existingCategories.includes(categoryEdit) ||
                      categoryEdit === "__new__" ||
                      !categoryEdit
                        ? []
                        : [{ value: categoryEdit, label: categoryEdit }]),
                      { value: "__new__", label: "+ New category…" },
                    ]}
                  />
                </div>
                <AnimatePresence initial={false}>
                  {categoryEdit === "__new__" && (
                    <motion.div
                      className="field"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <label>New category</label>
                      <input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Survival, Modded…"
                        maxLength={40}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="instance-settings-card">
                <div className="instance-settings-card-head">
                  <span className="instance-settings-card-icon">
                    <Icon name="layers" size={16} />
                  </span>
                  <div>
                    <h3>Game</h3>
                    <p>Version is locked after create. RAM can change later.</p>
                  </div>
                </div>
                <div className="instance-settings-facts">
                  <span className="tag">{profile.mcVersion}</span>
                  <span className="tag">{formatLoader(profile.loader)}</span>
                  <span className={`tag ${profile.installed ? "success" : "warn"}`}>
                    {profile.installed ? "Ready" : "Not installed"}
                  </span>
                </div>
                <div className="field">
                  <label>Allocated RAM</label>
                  <NumberStepper
                    value={ramEdit}
                    min={1024}
                    max={65536}
                    step={512}
                    suffix="MB"
                    onChange={setRamEdit}
                  />
                  <p className="field-hint">
                    {ramEdit >= 8192
                      ? "For large modpacks."
                      : ramEdit >= 4096
                        ? "Typical for Fabric or Forge."
                        : "Vanilla is fine. Mods usually want 4 GB or more."}
                  </p>
                </div>
              </div>

              <div className="instance-settings-card">
                <div className="instance-settings-card-head">
                  <span className="instance-settings-card-icon">
                    <Icon name="settings" size={16} />
                  </span>
                  <div>
                    <h3>Java</h3>
                    <p>This version needs Java {requiredJava} or newer.</p>
                  </div>
                </div>
                <div className="field">
                  <label>Java runtime</label>
                  <Select
                    value={javaEdit}
                    onChange={setJavaEdit}
                    options={javaOptions}
                    placeholder={javaLoading ? "Detecting Java…" : "Auto-detect"}
                  />
                  <p className="field-hint">
                    Picked at launch unless you set a path.
                  </p>
                </div>
              </div>

              <div className="instance-settings-card">
                <div className="instance-settings-card-head">
                  <span className="instance-settings-card-icon">
                    <Icon name="folder" size={16} />
                  </span>
                  <div>
                    <h3>Files</h3>
                    <p>Instance directory and play stats.</p>
                  </div>
                </div>
                <div className="instance-settings-meta">
                  <div className="instance-settings-meta-row">
                    <span>Created</span>
                    <strong>{new Date(profile.createdAt).toLocaleDateString()}</strong>
                  </div>
                  <div className="instance-settings-meta-row">
                    <span>Last played</span>
                    <strong>{formatLastPlayed(profile.lastPlayed)}</strong>
                  </div>
                  <div className="instance-settings-meta-row">
                    <span>Play time</span>
                    <strong>{formatPlayTime(profile.playTimeMs)}</strong>
                  </div>
                </div>
                <div className="instance-settings-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => openInstanceFolder()}
                  >
                    <Icon name="folder" size={14} />
                    Open folder
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => openModsFolder()}
                  >
                    <Icon name="folder" size={14} />
                    Mods folder
                  </button>
                </div>
              </div>

              <div className="instance-settings-card is-danger span-2">
                <div className="instance-settings-card-head">
                  <span className="instance-settings-card-icon">
                    <Icon name="trash" size={16} />
                  </span>
                  <div>
                    <h3>Danger zone</h3>
                    <p>Delete this instance and its files. This cannot be undone.</p>
                  </div>
                </div>
                <div className="instance-settings-card-actions">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={busyAction === "delete"}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Icon name="trash" size={14} />
                    Delete instance
                  </button>
                </div>
              </div>
            </div>

            <div className="instance-settings-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busyAction === "update-profile" || !dirty || !nameEdit.trim()}
                onClick={saveSettings}
              >
                {busyAction === "update-profile" ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete instance"
        width="min(400px, 92vw)"
      >
        <p className="delete-instance-copy">
          Delete <strong>{profile.name}</strong>? This removes the instance and its files.
          This cannot be undone.
        </p>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busyAction === "delete"}
            onClick={() => {
              deleteProfile(profile.id);
              setConfirmDelete(false);
              setPage("play");
            }}
          >
            {busyAction === "delete" ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
