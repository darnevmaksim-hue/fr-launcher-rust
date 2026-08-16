import { useEffect, useState } from "react";
import type { HorizonConfig } from "../lib/types";
import { displaySrc, filePathToUrl } from "../lib/imageUrl";
import { NumberStepper } from "./NumberStepper";
import { Select } from "./Select";
import { Tabs } from "./Tabs";
import { Toggle } from "./Toggle";
import { useLauncherStore } from "../store/launcherStore";

const HORIZON_TABS = [
  { id: "general", label: "General" },
  { id: "discord", label: "Discord RPC" },
  { id: "display", label: "Display" },
  { id: "privacy", label: "Privacy" },
];

export function HorizonConfigPanel() {
  const {
    selectedProfileId,
    horizonConfig,
    loadHorizonConfig,
    saveHorizonConfig,
    busyAction,
    backgrounds,
  } = useLauncherStore();

  const [local, setLocal] = useState<HorizonConfig | null>(null);
  const [tab, setTab] = useState("general");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProfileId) loadHorizonConfig();
  }, [selectedProfileId, loadHorizonConfig]);

  useEffect(() => {
    if (horizonConfig) setLocal(horizonConfig);
  }, [horizonConfig]);

  const selectedName = local?.background ?? horizonConfig?.background;
  const previewAsset = backgrounds.find((b) => b.name === selectedName);
  const previewPath = previewAsset?.frames?.[0] ?? previewAsset?.path ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!previewPath) {
      setPreviewUrl(null);
      return;
    }
    void displaySrc(previewPath)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [previewPath]);

  if (!local) {
    return (
      <div className="page-empty" style={{ minHeight: 120 }}>
        <div className="spinner" />
        <p>Loading config…</p>
      </div>
    );
  }

  const update = (patch: Partial<HorizonConfig>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    useLauncherStore.setState({ horizonConfig: next });
  };

  const updateDisplay = (
    patch: Partial<HorizonConfig["discordRpc"]["display"]>,
  ) => {
    const next = {
      ...local,
      discordRpc: {
        ...local.discordRpc,
        display: { ...local.discordRpc.display, ...patch },
      },
    };
    setLocal(next);
    useLauncherStore.setState({ horizonConfig: next });
  };

  const updatePrivacy = (
    patch: Partial<HorizonConfig["discordRpc"]["privacy"]>,
  ) => {
    const next = {
      ...local,
      discordRpc: {
        ...local.discordRpc,
        privacy: { ...local.discordRpc.privacy, ...patch },
      },
    };
    setLocal(next);
    useLauncherStore.setState({ horizonConfig: next });
  };

  return (
    <div className="horizon-config-panel">
      <div className="horizon-config-header">
        <p className="page-desc">
          Edit <code>horizonui.json</code> — applied before launch.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busyAction === "save-config"}
          onClick={() => saveHorizonConfig(local)}
        >
          {busyAction === "save-config" ? "Saving…" : "Save"}
        </button>
      </div>

      <Tabs tabs={HORIZON_TABS} active={tab} onChange={setTab} pillId="horizon-tabs" />

      <div className="horizon-tab-content">
        {tab === "general" && (
          <div className="settings-grid">
            <div>
              <div className="field">
                <label>Background preset</label>
                <Select
                  value={local.background}
                  onChange={(v) => update({ background: v })}
                  options={[
                    ...backgrounds.map((b) => ({
                      value: b.name,
                      label: b.name,
                    })),
                    ...(backgrounds.some((b) => b.name === local.background)
                      ? []
                      : [{ value: local.background, label: local.background }]),
                  ]}
                />
              </div>
              <div className="field">
                <label>Background FPS</label>
                <NumberStepper
                  value={local.backgroundFrame}
                  min={1}
                  max={60}
                  step={1}
                  suffix="FPS"
                  onChange={(backgroundFrame) => update({ backgroundFrame })}
                />
              </div>
              <Toggle
                label="Auto updater"
                value={local.autoUpdater}
                onChange={(v) => update({ autoUpdater: v })}
                compact
              />
              <Toggle
                label="Agreed to terms"
                value={local.agreedToTerms}
                onChange={(v) => update({ agreedToTerms: v })}
                compact
              />
            </div>
            <div className="bg-preview panel">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Background"
                  className="bg-preview-img"
                  onError={() => {
                    if (!previewPath) return;
                    void filePathToUrl(previewPath).then(setPreviewUrl).catch(() => {
                      setPreviewUrl(null);
                    });
                  }}
                />
              ) : (
                <div className="bg-preview-placeholder">
                  <span>{local.background}</span>
                  <small>HorizonUI / NekoUI packs in resourcepacks/</small>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "discord" && (
          <>
            <Toggle
              label="Enable Discord RPC"
              value={local.discordRpc.enabled}
              onChange={(v) =>
                update({ discordRpc: { ...local.discordRpc, enabled: v } })
              }
              compact
            />
            <div className="field" style={{ marginTop: 12 }}>
              <label>Update interval</label>
              <NumberStepper
                value={local.discordRpc.updateInterval}
                min={500}
                max={60_000}
                step={100}
                suffix="ms"
                onChange={(updateInterval) =>
                  update({
                    discordRpc: {
                      ...local.discordRpc,
                      updateInterval,
                    },
                  })
                }
              />
            </div>
          </>
        )}

        {tab === "display" && (
          <div className="toggle-grid">
            <Toggle label="Show health" value={local.discordRpc.display.showHealth} onChange={(v) => updateDisplay({ showHealth: v })} compact />
            <Toggle label="Show armor" value={local.discordRpc.display.showArmor} onChange={(v) => updateDisplay({ showArmor: v })} compact />
            <Toggle label="Show level" value={local.discordRpc.display.showLevel} onChange={(v) => updateDisplay({ showLevel: v })} compact />
            <Toggle label="Show time" value={local.discordRpc.display.showTime} onChange={(v) => updateDisplay({ showTime: v })} compact />
            <Toggle label="Show biome" value={local.discordRpc.display.showBiome} onChange={(v) => updateDisplay({ showBiome: v })} compact />
            <Toggle label="Dynamic images" value={local.discordRpc.display.dynamicImages} onChange={(v) => updateDisplay({ dynamicImages: v })} compact />
          </div>
        )}

        {tab === "privacy" && (
          <div className="toggle-grid">
            <Toggle label="Show coordinates" value={local.discordRpc.privacy.showCoordinates} onChange={(v) => updatePrivacy({ showCoordinates: v })} compact />
            <Toggle label="Show server IP" value={local.discordRpc.privacy.showServerIp} onChange={(v) => updatePrivacy({ showServerIp: v })} compact />
            <Toggle label="Show server name" value={local.discordRpc.privacy.showServerName} onChange={(v) => updatePrivacy({ showServerName: v })} compact />
            <Toggle label="Hide while AFK" value={local.discordRpc.privacy.hideWhileAfk} onChange={(v) => updatePrivacy({ hideWhileAfk: v })} compact />
            <Toggle label="Obfuscate in hardcore" value={local.discordRpc.privacy.obfuscateInHardcore} onChange={(v) => updatePrivacy({ obfuscateInHardcore: v })} compact />
          </div>
        )}
      </div>
    </div>
  );
}
