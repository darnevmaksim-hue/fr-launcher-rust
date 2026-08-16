import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Modal } from "./Modal";
import { NumberStepper } from "./NumberStepper";
import { Select } from "./Select";
import { formatLoader } from "../lib/format";
import { useLauncherStore } from "../store/launcherStore";

interface CreateProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProfileModal({ open, onClose }: CreateProfileModalProps) {
  const {
    versionGroups,
    launcherSettings,
    profiles,
    createProfile,
    busyAction,
  } = useLauncherStore();

  const defaultRam = launcherSettings?.defaultRamMb ?? 4096;
  const defaultGroup = versionGroups[0];
  const defaultVersion = defaultGroup?.versions[0] ?? "1.21.1";

  const existingCategories = useMemo(() => {
    const set = new Set(profiles.map((p) => p.category || "General"));
    return Array.from(set).sort();
  }, [profiles]);

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState(defaultGroup?.id ?? "");
  const [mcVersion, setMcVersion] = useState(defaultVersion);
  const [loader, setLoader] = useState(defaultGroup?.loaders[0] ?? "fabric");
  const [ramMb, setRamMb] = useState(defaultRam);
  const [category, setCategory] = useState("General");
  const [newCategory, setNewCategory] = useState("");

  const selectedGroup = versionGroups.find((g) => g.id === groupId);

  const versionOptions = useMemo(
    () =>
      (selectedGroup?.versions ?? []).map((v) => ({
        value: v,
        label: v,
      })),
    [selectedGroup],
  );

  const loaderOptions = useMemo(
    () =>
      (selectedGroup?.loaders ?? ["fabric"]).map((l) => ({
        value: l,
        label: formatLoader(l),
      })),
    [selectedGroup],
  );

  const groupOptions = useMemo(
    () =>
      versionGroups.map((g) => ({
        value: g.id,
        label: g.label,
      })),
    [versionGroups],
  );

  const categoryOptions = useMemo(
    () =>
      existingCategories.map((c) => ({ value: c, label: c })),
    [existingCategories],
  );

  const javaRequired = selectedGroup?.java ?? 21;
  const finalCategory =
    category === "__new__" ? newCategory.trim() || "General" : category;

  const handleGroupChange = (id: string) => {
    setGroupId(id);
    const group = versionGroups.find((g) => g.id === id);
    if (group) {
      setMcVersion(group.versions[0]);
      setLoader(group.loaders[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createProfile(
      name.trim(),
      mcVersion,
      loader,
      ramMb,
      finalCategory,
    );
    setName("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Instance">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Instance name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My HorizonUI"
            autoFocus
          />
        </div>

        <div className="field">
          <label>Category</label>
          <Select
            value={category}
            onChange={setCategory}
            options={[
              ...categoryOptions,
              { value: "__new__", label: "+ New category…" },
            ]}
          />
        </div>
        <AnimatePresence initial={false}>
          {category === "__new__" && (
            <motion.div
              className="field"
              initial={{ height: 0, opacity: 0, y: -6 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden" }}
            >
              <label>New category name</label>
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Survival, Testing…"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="field">
          <label>Version group</label>
          <Select
            value={groupId}
            onChange={handleGroupChange}
            options={groupOptions}
          />
          {selectedGroup && selectedGroup.versions.length > 1 && (
            <p className="field-hint">
              Shared mod jar for {selectedGroup.label}
            </p>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label>Minecraft</label>
            <Select
              value={mcVersion}
              onChange={setMcVersion}
              options={versionOptions}
            />
          </div>
          <div className="field">
            <label>Loader</label>
            <Select value={loader} onChange={setLoader} options={loaderOptions} />
          </div>
        </div>

        <div className="field">
          <label>RAM</label>
          <NumberStepper
            value={ramMb}
            min={1024}
            max={65536}
            step={512}
            suffix="MB"
            onChange={setRamMb}
          />
        </div>
        <p className="field-hint">Requires Java {javaRequired}+</p>

        <div className="btn-row" style={{ marginTop: 16 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busyAction === "create" || !name.trim()}
          >
            {busyAction === "create" ? "Creating…" : "Create"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
