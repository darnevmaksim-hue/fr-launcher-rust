import { AnimatePresence, LayoutGroup, motion, type Variants } from "framer-motion";
import { useMemo, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from "react";
import { ContextMenu, type ContextMenuEntry } from "../components/ContextMenu";
import { CreateProfileModal } from "../components/CreateProfileModal";
import { Icon } from "../components/Icon";
import { Modal } from "../components/Modal";
import { NewsPanel } from "../components/NewsPanel";
import { AccountSkinHead } from "../components/AccountSkinHead";
import { formatLastPlayed, formatLoader, formatPlayTime } from "../lib/format";
import { useLauncherStore } from "../store/launcherStore";
import type { Profile } from "../lib/types";

const listEase = [0.22, 1, 0.36, 1] as const;

type RowAnim = { dir: number; i: number };

const rowVariants: Variants = {
  initial: ({ dir }: RowAnim) => ({
    opacity: 0,
    x: 28 * dir,
  }),
  animate: ({ i }: RowAnim) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.32,
      ease: listEase,
      delay: Math.min(i, 8) * 0.03,
    },
  }),
  exit: ({ dir }: RowAnim) => ({
    opacity: 0,
    x: -20 * dir,
    transition: {
      duration: 0.2,
      ease: listEase,
    },
  }),
};

function instanceInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

function instanceHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i) * 17) % 360;
  }
  return hash;
}

export function PlayPage() {
  const profiles = useLauncherStore((s) => s.profiles);
  const account = useLauncherStore((s) => s.account);
  const openInstance = useLauncherStore((s) => s.openInstance);
  const launchSelected = useLauncherStore((s) => s.launchSelected);
  const busyAction = useLauncherStore((s) => s.busyAction);
  const gameRunning = useLauncherStore((s) => s.gameRunning);
  const killGame = useLauncherStore((s) => s.killGame);
  const selectedProfileId = useLauncherStore((s) => s.selectedProfileId);
  const selectProfile = useLauncherStore((s) => s.selectProfile);
  const syncProfileTheme = useLauncherStore((s) => s.syncProfileTheme);
  const updateProfile = useLauncherStore((s) => s.updateProfile);
  const deleteProfile = useLauncherStore((s) => s.deleteProfile);

  const [showCreate, setShowCreate] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; profile: Profile } | null>(null);
  const [dialog, setDialog] = useState<
    | { kind: "rename"; profile: Profile; value: string }
    | { kind: "category"; profile: Profile; value: string }
    | { kind: "delete"; profile: Profile }
    | null
  >(null);

  const categories = useMemo(() => {
    const set = new Set(profiles.map((p) => p.category || "General"));
    return Array.from(set).sort();
  }, [profiles]);

  const filterIndex = filterCategory === null ? 0 : categories.indexOf(filterCategory) + 1;
  const prevFilterIndex = useRef(filterIndex);
  const filterDir = useRef(1);
  if (filterIndex !== prevFilterIndex.current) {
    filterDir.current = filterIndex >= prevFilterIndex.current ? 1 : -1;
    prevFilterIndex.current = filterIndex;
  }
  const dir = filterDir.current;

  const visibleProfiles = useMemo(() => {
    const list = filterCategory
      ? profiles.filter((p) => (p.category || "General") === filterCategory)
      : profiles;
    return [...list].sort((a, b) => {
      const aTime = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
      const bTime = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
      return bTime - aTime;
    });
  }, [profiles, filterCategory]);

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  const readyCount = useMemo(
    () => profiles.filter((p) => p.installed).length,
    [profiles],
  );

  const totalPlayTime = useMemo(
    () => profiles.reduce((sum, p) => sum + (p.playTimeMs ?? 0), 0),
    [profiles],
  );

  const menuItems = useMemo((): ContextMenuEntry[] => {
    if (!menu) return [];
    const profile = menu.profile;
    const current = profile.category || "General";
    return [
      {
        type: "item",
        id: "rename",
        label: "Rename",
        icon: "edit",
        onSelect: () => setDialog({ kind: "rename", profile, value: profile.name }),
      },
      { type: "separator" },
      {
        type: "item",
        id: "move",
        label: "Move to category",
        icon: "folder",
        submenu: [
          ...categories.map((cat) => ({
            type: "item" as const,
            id: `cat-${cat}`,
            label: cat,
            checked: cat === current,
            onSelect: () => {
              if (cat === current) return;
              const latest = useLauncherStore.getState().profiles.find((p) => p.id === profile.id) ?? profile;
              void updateProfile({ ...latest, category: cat });
            },
          })),
          { type: "separator" },
          {
            type: "item",
            id: "new-cat",
            label: "New category…",
            icon: "plus",
            onSelect: () => setDialog({ kind: "category", profile, value: "" }),
          },
        ],
      },
      { type: "separator" },
      {
        type: "item",
        id: "delete",
        label: "Delete instance",
        icon: "trash",
        danger: true,
        onSelect: () => setDialog({ kind: "delete", profile }),
      },
    ];
  }, [menu, categories, updateProfile]);

  const handleSelect = (profile: Profile) => {
    selectProfile(profile.id);
    void syncProfileTheme();
  };

  const handleQuickPlay = async () => {
    if (!selected) return;
    if (selected.installed) {
      await launchSelected();
    } else {
      openInstance(selected.id);
    }
  };

  const handleContextMenu = (event: MouseEvent, profile: Profile) => {
    event.preventDefault();
    event.stopPropagation();
    handleSelect(profile);
    setMenu({ x: event.clientX, y: event.clientY, profile });
  };

  const closeDialog = () => setDialog(null);

  const saveDialog = async (event: FormEvent) => {
    event.preventDefault();
    if (!dialog || dialog.kind === "delete") return;
    const value = dialog.value.trim();
    if (!value) return;
    const latest =
      useLauncherStore.getState().profiles.find((p) => p.id === dialog.profile.id) ?? dialog.profile;
    if (dialog.kind === "rename") {
      if (value === latest.name) {
        closeDialog();
        return;
      }
      await updateProfile({ ...latest, name: value });
    } else {
      const category = value || "General";
      if (category === (latest.category || "General")) {
        closeDialog();
        return;
      }
      await updateProfile({ ...latest, category });
    }
    closeDialog();
  };

  const confirmDelete = async () => {
    if (dialog?.kind !== "delete") return;
    await deleteProfile(dialog.profile.id);
    closeDialog();
  };

  const saving = busyAction === "update-profile";
  const deleting = busyAction === "delete";

  if (profiles.length === 0) {
    return (
      <div className="play-home">
        <CreateProfileModal open={showCreate} onClose={() => setShowCreate(false)} />
        <div className="play-empty glass-card">
          <div className="play-empty-icon">
            <img src="/horizonui.png" alt="" />
          </div>
          <h2>No instances yet</h2>
          <p>Create your first instance to install HorizonUI and play.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Icon name="plus" size={14} />
            Create instance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="play-home">
      <CreateProfileModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ContextMenu
        open={Boolean(menu)}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        items={menuItems}
        onClose={() => setMenu(null)}
      />
      <Modal
        open={dialog?.kind === "rename"}
        onClose={closeDialog}
        title="Rename instance"
        width="min(380px, 92vw)"
      >
        {dialog?.kind === "rename" && (
          <form onSubmit={(e) => void saveDialog(e)}>
            <div className="field">
              <label>Name</label>
              <input
                value={dialog.value}
                onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
                autoFocus
                maxLength={64}
              />
            </div>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !dialog.value.trim()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeDialog}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={dialog?.kind === "category"}
        onClose={closeDialog}
        title="New category"
        width="min(380px, 92vw)"
      >
        {dialog?.kind === "category" && (
          <form onSubmit={(e) => void saveDialog(e)}>
            <div className="field">
              <label>Category name</label>
              <input
                value={dialog.value}
                onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
                placeholder="Survival, Modded…"
                autoFocus
                maxLength={40}
              />
            </div>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !dialog.value.trim()}
              >
                {saving ? "Moving…" : "Move"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeDialog}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={dialog?.kind === "delete"}
        onClose={closeDialog}
        title="Delete instance"
        width="min(400px, 92vw)"
      >
        {dialog?.kind === "delete" && (
          <div>
            <p className="delete-instance-copy">
              Delete <strong>{dialog.profile.name}</strong>? This removes the instance
              and its files. This cannot be undone.
            </p>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeDialog}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      <section className="play-library" aria-label="Instances">
        <div className="play-category-bar">
          <LayoutGroup id="play-category-tabs">
            <div className="play-category-tabs">
              <button
                type="button"
                className={`cat-chip${filterCategory === null ? " active" : ""}`}
                onClick={() => setFilterCategory(null)}
              >
                {filterCategory === null && (
                  <motion.span
                    layoutId="play-cat-pill"
                    className="cat-chip-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
                  />
                )}
                <span className="cat-chip-label">All</span>
              </button>
              {categories.map((cat) => {
                const active = filterCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-chip${active ? " active" : ""}`}
                    onClick={() => setFilterCategory(cat)}
                  >
                    {active && (
                      <motion.span
                        layoutId="play-cat-pill"
                        className="cat-chip-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
                      />
                    )}
                    <span className="cat-chip-label">{cat}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
          <button
            type="button"
            className="cat-chip add"
            onClick={() => setShowCreate(true)}
          >
            <span className="cat-chip-label">
              <Icon name="plus" size={12} />
              New
            </span>
          </button>
        </div>

        <div className="instance-list">
          <AnimatePresence initial={false} custom={{ dir, i: 0 }}>
            {visibleProfiles.length === 0 ? (
              <motion.p
                key="empty"
                className="instance-list-empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: listEase }}
              >
                No instances in this category.
              </motion.p>
            ) : (
              visibleProfiles.map((p, i) => {
                const active = p.id === selectedProfileId;
                return (
                  <motion.div
                    key={p.id}
                    className="instance-row-motion"
                    custom={{ dir, i }}
                    variants={rowVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <button
                      type="button"
                      className={`instance-row${active ? " active" : ""}`}
                      onClick={() => handleSelect(p)}
                      onDoubleClick={() => openInstance(p.id)}
                      onContextMenu={(event) => handleContextMenu(event, p)}
                    >
                      <span
                        className="instance-row-icon"
                        style={{ "--shortcut-hue": instanceHue(p.name) } as CSSProperties}
                      >
                        {instanceInitial(p.name)}
                        <span
                          className="shortcut-status"
                          data-installed={p.installed ? "true" : "false"}
                        />
                      </span>
                      <span className="instance-row-main">
                        <strong>{p.name}</strong>
                        <span className="instance-row-meta">
                          {p.mcVersion} · {formatLoader(p.loader)}
                          {p.installed ? "" : " · Setup"}
                        </span>
                      </span>
                      <span className="instance-row-stats">
                        <span>
                          <small>Last played</small>
                          {formatLastPlayed(p.lastPlayed)}
                        </span>
                        <span>
                          <small>Play time</small>
                          {formatPlayTime(p.playTimeMs)}
                        </span>
                      </span>
                    </button>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="play-center" aria-hidden={!selected}>
        {selected ? (
          <div className="play-center-hero">
            <p className="play-center-eyebrow">{selected.category || "General"}</p>
            <h1>{selected.name}</h1>
            <p className="play-center-meta">
              {selected.mcVersion} · {formatLoader(selected.loader)}
              {selected.installed ? " · Ready" : " · Setup required"}
              {" · "}
              {formatPlayTime(selected.playTimeMs)} played
            </p>
          </div>
        ) : (
          <p className="play-center-hint">Select an instance above</p>
        )}
      </section>

      <section className="play-dock" aria-label="Quick actions">
        <article className="glass-card play-dock-card stats-card">
          <header className="dock-card-header">Stats</header>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value accent">{profiles.length}</span>
              <span className="stat-label">Instances</span>
            </div>
            <div className="stat-item">
              <span className="stat-value success">{readyCount}</span>
              <span className="stat-label">Ready</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{formatPlayTime(totalPlayTime)}</span>
              <span className="stat-label">Total time played</span>
            </div>
            <div className="stat-item">
              <span className="stat-value muted">
                {selected ? formatLastPlayed(selected.lastPlayed) : "—"}
              </span>
              <span className="stat-label">Last played</span>
            </div>
          </div>
        </article>

        <article className="glass-card play-dock-card news-card">
          <header className="dock-card-header">News</header>
          <NewsPanel />
        </article>

        <article className="glass-card play-dock-card play-card">
          <header className="dock-card-header">Play</header>
          {selected ? (
            <div className="play-card-body">
              <div className="play-card-info">
                {account ? (
                  <AccountSkinHead
                    account={account}
                    className="play-card-avatar"
                    size={40}
                  />
                ) : (
                  <div className="play-card-avatar placeholder" />
                )}
                <div>
                  <strong>{selected.name}</strong>
                  <div className="tag-row">
                    <span className="tag tag-sm">{selected.mcVersion}</span>
                    <span className="tag tag-sm">{formatLoader(selected.loader)}</span>
                    <span className={`tag tag-sm ${selected.installed ? "success" : "warn"}`}>
                      {selected.installed ? "Ready" : "Setup"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="play-card-actions">
                {gameRunning ? (
                  <button type="button" className="btn btn-danger" onClick={() => killGame()}>
                    Kill game
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-play"
                    disabled={
                      !selected.installed ||
                      busyAction === "install" ||
                      busyAction === "launch"
                    }
                    onClick={() => void handleQuickPlay()}
                  >
                    <Icon name="play" size={16} />
                    {busyAction === "launch"
                      ? "Launching…"
                      : selected.installed
                        ? "Play"
                        : "Setup"}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => openInstance(selected.id)}
                >
                  Manage
                </button>
              </div>
            </div>
          ) : (
            <p className="play-card-empty">Pick an instance from the list above.</p>
          )}
        </article>
      </section>
    </div>
  );
}
