import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { AccountSkinHead } from "../components/AccountSkinHead";
import { Icon } from "../components/Icon";
import { authTypeLabel } from "../lib/accountSkin";
import type { LauncherSettings, SettingsTabId } from "../lib/types";
import { Tabs } from "../components/Tabs";
import { Select } from "../components/Select";
import { NumberStepper } from "../components/NumberStepper";
import { Toggle } from "../components/Toggle";
import { useLauncherStore } from "../store/launcherStore";

const SETTINGS_TABS = [
  { id: "account", label: "Account" },
  { id: "defaults", label: "Defaults" },
  { id: "java", label: "Java" },
  { id: "data", label: "Data" },
  { id: "about", label: "About" },
];

const LOGIN_TABS = [
  { id: "microsoft", label: "Microsoft" },
  { id: "elyby", label: "Ely.by" },
  { id: "offline", label: "Offline" },
];

function isSettingsDirty(local: LauncherSettings, saved: LauncherSettings) {
  const text = (v?: string | null) => v ?? "";
  return (
    local.defaultRamMb !== saved.defaultRamMb ||
    local.closeOnLaunch !== saved.closeOnLaunch ||
    local.theme !== saved.theme ||
    (local.animatedBackgrounds ?? false) !== (saved.animatedBackgrounds ?? false) ||
    text(local.curseforgeApiKey) !== text(saved.curseforgeApiKey) ||
    text(local.microsoftOAuthClientId) !== text(saved.microsoftOAuthClientId) ||
    text(local.elyOAuthClientId) !== text(saved.elyOAuthClientId) ||
    text(local.elyOAuthClientSecret) !== text(saved.elyOAuthClientSecret)
  );
}

export function LauncherSettingsPage() {
  const {
    launcherSettings,
    saveLauncherSettings,
    account,
    accounts,
    activeAccountId,
    launcherUpdate,
    appVersion,
    loginMicrosoftBrowser,
    loginMicrosoftDevice,
    loginElybyBrowser,
    loginElybyDevice,
    loginOffline,
    logout,
    switchAccount,
    removeAccount,
    exportProfiles,
    importProfiles,
    busyAction,
    javaInstallations,
    javaLoading,
    loadJavaInstallations,
    settingsTab,
    setSettingsTab,
    checkForUpdates,
  } = useLauncherStore();

  const [local, setLocal] = useState<LauncherSettings | null>(
    () => useLauncherStore.getState().launcherSettings,
  );
  const [loginTab, setLoginTab] = useState("microsoft");
  const [offlineUsername, setOfflineUsername] = useState("");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [logFilePath, setLogFilePath] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateChecked, setUpdateChecked] = useState(false);

  useEffect(() => {
    if (launcherSettings) setLocal(launcherSettings);
  }, [launcherSettings]);

  useEffect(() => {
    if (settingsTab === "java") void loadJavaInstallations();
  }, [settingsTab, loadJavaInstallations]);

  useEffect(() => {
    if (settingsTab !== "data") return;
    void api
      .logFile()
      .then(setLogFilePath)
      .catch(() => setLogFilePath(null));
  }, [settingsTab]);

  const dirty = useMemo(
    () => (local && launcherSettings ? isSettingsDirty(local, launcherSettings) : false),
    [local, launcherSettings],
  );

  if (!local) {
    return (
      <div className="page-empty">
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  const loginPanel = (
    <>
      <Tabs
        tabs={LOGIN_TABS}
        active={loginTab}
        onChange={setLoginTab}
        compact
        pillId="login-tabs"
      />

      {loginTab === "microsoft" && (
        <div className="login-panel">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busyAction === "ms-login"}
            onClick={() => loginMicrosoftBrowser()}
          >
            {busyAction === "ms-login"
              ? "Waiting for Microsoft…"
              : "Sign in with Microsoft"}
          </button>
          <p className="field-hint">
            Opens Microsoft login in your browser.
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busyAction === "ms-login"}
            onClick={() => loginMicrosoftDevice()}
          >
            Sign in with code / QR
          </button>
          <p className="field-hint">
            Open microsoft.com/link or scan the QR, then enter the code shown here.
          </p>
        </div>
      )}

      {loginTab === "elyby" && (
        <div className="login-panel">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busyAction === "ely-login"}
            onClick={() => loginElybyBrowser()}
          >
            {busyAction === "ely-login"
              ? "Waiting for Ely.by…"
              : "Sign in with Ely.by"}
          </button>
          <p className="field-hint">Opens account.ely.by in your browser.</p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busyAction === "ely-login"}
            onClick={() => loginElybyDevice()}
          >
            Sign in with code / QR
          </button>
          <p className="field-hint">
            Open account.ely.by/code or scan the QR.
          </p>
        </div>
      )}

      {loginTab === "offline" && (
        <div className="login-panel">
          <div className="field">
            <label>Username</label>
            <input
              value={offlineUsername}
              onChange={(e) => setOfflineUsername(e.target.value)}
              placeholder="Your in-game name"
              maxLength={16}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busyAction === "offline-login"}
            onClick={() => loginOffline(offlineUsername)}
          >
            {busyAction === "offline-login" ? "Setting up…" : "Play offline"}
          </button>
          <p className="field-hint">No Microsoft or Ely.by login. Online servers will reject this.</p>
        </div>
      )}
    </>
  );

  const saveButton = (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      disabled={!dirty || busyAction === "save-settings"}
      onClick={() => saveLauncherSettings(local)}
    >
      {busyAction === "save-settings" ? "Saving…" : "Save changes"}
    </button>
  );

  return (
    <div className="settings-page">
      <div className="settings-hero">
        <div className="settings-hero-copy">
          <h2>Settings</h2>
          <p className="page-desc">Accounts, Java, and launcher data.</p>
        </div>
        {dirty && saveButton}
      </div>

      {launcherUpdate && (
        <div className="settings-update-banner">
          <div className="settings-update-copy">
            <span className="update-badge">Update</span>
            <div>
              <strong>v{launcherUpdate.version} is available</strong>
              <p>You are on v{appVersion}. Download the latest build to stay current.</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => api.openUrl(launcherUpdate.url)}
          >
            <Icon name="download" size={14} />
            Download
          </button>
        </div>
      )}

      <Tabs
        tabs={SETTINGS_TABS}
        active={settingsTab}
        onChange={(id) => setSettingsTab(id as SettingsTabId)}
        pillId="settings-tabs"
      />

      <div className="settings-body">
        {settingsTab === "account" && (
          <div className="settings-grid">
            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-icon">
                  <Icon name="user" size={16} />
                </span>
                <div>
                  <h3>Saved accounts</h3>
                <p>Used when you launch the game.</p>
                </div>
              </div>
              {accounts.length > 0 ? (
                <div className="account-list">
                  {accounts.map((acc) => {
                    const isActive = acc.uuid === activeAccountId;
                    return (
                      <div
                        key={acc.uuid}
                        className={`account-list-item${isActive ? " active" : ""}`}
                      >
                        <AccountSkinHead
                          account={acc}
                          className="account-skin-head"
                          size={48}
                        />
                        <div className="account-list-meta">
                          <strong>{acc.username}</strong>
                          <span className="meta-line">
                            {authTypeLabel(acc.authType)}
                            {isActive ? " · Active" : ""}
                          </span>
                        </div>
                        <div className="account-list-actions">
                          {!isActive && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={busyAction === "switch-account"}
                              onClick={() => switchAccount(acc.uuid)}
                            >
                              Use
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busyAction === "remove-account"}
                            onClick={() => removeAccount(acc.uuid)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="settings-empty-copy">
                  No accounts yet. Sign in on the right to add one.
                </p>
              )}
              {account && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => logout()}
                >
                  Sign out active account
                </button>
              )}
            </section>

            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-icon">
                  <Icon name="plus" size={16} />
                </span>
                <div>
                  <h3>{accounts.length > 0 ? "Add account" : "Sign in"}</h3>
                  <p>Microsoft, Ely.by, or a local offline name.</p>
                </div>
              </div>
              {accounts.length > 0 && !showAddAccount ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddAccount(true)}
                >
                  Add another account
                </button>
              ) : (
                loginPanel
              )}
              {accounts.length > 0 && showAddAccount && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddAccount(false)}
                >
                  Cancel
                </button>
              )}
            </section>
          </div>
        )}

        {settingsTab === "defaults" && (
          <div className="settings-grid">
            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-icon">
                  <Icon name="layers" size={16} />
                </span>
                <div>
                  <h3>New instances</h3>
                  <p>Defaults applied when you create a profile.</p>
                </div>
              </div>
              <div className="field">
                <label>Default RAM</label>
                <NumberStepper
                  value={local.defaultRamMb}
                  min={1024}
                  max={65536}
                  step={512}
                  suffix="MB"
                  onChange={(defaultRamMb) => setLocal({ ...local, defaultRamMb })}
                />
                <p className="field-hint">
                  {local.defaultRamMb >= 8192
                    ? "For large modpacks."
                    : local.defaultRamMb >= 4096
                      ? "Typical for Fabric or Forge."
                      : "Vanilla is fine. Mods usually want 4 GB or more."}
                </p>
              </div>
              <Toggle
                label="Close launcher when the game starts"
                hint="Hide the window after launch. It comes back when the game exits."
                value={local.closeOnLaunch}
                onChange={(v) => setLocal({ ...local, closeOnLaunch: v })}
              />
            </section>

            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-icon">
                  <Icon name="diamond" size={16} />
                </span>
                <div>
                  <h3>Appearance</h3>
                  <p>Wallpaper and theme.</p>
                </div>
              </div>
              <div className="field">
                <label>Theme</label>
                <Select
                  value={local.theme}
                  onChange={(v) => setLocal({ ...local, theme: v })}
                  options={[{ value: "horizon", label: "Horizon" }]}
                />
              </div>
              <Toggle
                label="Animate launcher background"
                hint="Instance wallpapers play instead of a still frame. Uses more memory."
                value={local.animatedBackgrounds ?? false}
                onChange={(v) => {
                  const next = { ...local, animatedBackgrounds: v };
                  setLocal(next);
                  void saveLauncherSettings(next);
                }}
              />
            </section>
          </div>
        )}

        {settingsTab === "java" && (
          <section className="settings-card">
            <div className="settings-card-head">
              <span className="settings-card-icon">
                <Icon name="cpu" size={16} />
              </span>
              <div>
                <h3>Detected runtimes</h3>
                <p>Used unless an instance sets its own Java.</p>
              </div>
            </div>
            {javaLoading && javaInstallations.length === 0 ? (
              <p className="settings-empty-copy">Detecting Java…</p>
            ) : javaInstallations.length === 0 ? (
              <p className="settings-empty-copy">
                No Java detected. Install Java 17, 21, or 25, then reopen this tab.
              </p>
            ) : (
              <div className="java-list">
                {javaInstallations.map((j) => (
                  <div key={j.path} className="java-item">
                    <span className="java-item-badge">Java {j.version}</span>
                    <div className="java-item-meta">
                      <strong>{j.vendor || "Unknown vendor"}</strong>
                      <span className="meta-line">{j.path}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {settingsTab === "data" && (
          <div className="settings-grid">
            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-icon">
                  <Icon name="folder" size={16} />
                </span>
                <div>
                  <h3>Logs</h3>
                  <p>For bug reports.</p>
                </div>
              </div>
              <p className="field-hint">
                Written to a file under the launcher data folder, and to the terminal if you started from one.
              </p>
              {logFilePath && (
                <p className="settings-path">{logFilePath}</p>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  void api.openLogFolder().catch((e) => console.error(e));
                }}
              >
                <Icon name="folder" size={14} />
                Open log folder
              </button>
            </section>

            <section className="settings-card">
              <div className="settings-card-head">
                <span className="settings-card-icon">
                  <Icon name="download" size={16} />
                </span>
                <div>
                  <h3>Profiles</h3>
                  <p>Backup instance list as a zip.</p>
                </div>
              </div>
              <div className="settings-card-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busyAction === "export"}
                  onClick={() => exportProfiles()}
                >
                  Export profiles
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busyAction === "import"}
                  onClick={() => importProfiles()}
                >
                  Import profiles
                </button>
              </div>
            </section>

            <section className="settings-card span-2">
              <div className="settings-card-head">
                <span className="settings-card-icon">
                  <Icon name="key" size={16} />
                </span>
                <div>
                  <h3>Developer overrides</h3>
                  <p>Leave empty to use the built-in keys.</p>
                </div>
              </div>
              <div className="settings-fields-grid">
                <div className="field">
                  <label>Microsoft OAuth client ID</label>
                  <input
                    value={local.microsoftOAuthClientId ?? ""}
                    onChange={(e) =>
                      setLocal({
                        ...local,
                        microsoftOAuthClientId: e.target.value || null,
                      })
                    }
                    autoComplete="off"
                  />
                </div>
                <div className="field">
                  <label>CurseForge API key</label>
                  <input
                    type="password"
                    value={local.curseforgeApiKey ?? ""}
                    onChange={(e) =>
                      setLocal({
                        ...local,
                        curseforgeApiKey: e.target.value || null,
                      })
                    }
                    autoComplete="off"
                  />
                </div>
                <div className="field">
                  <label>Ely.by OAuth client ID</label>
                  <input
                    value={local.elyOAuthClientId ?? ""}
                    onChange={(e) =>
                      setLocal({
                        ...local,
                        elyOAuthClientId: e.target.value || null,
                      })
                    }
                    autoComplete="off"
                  />
                </div>
                <div className="field">
                  <label>Ely.by OAuth client secret</label>
                  <input
                    type="password"
                    value={local.elyOAuthClientSecret ?? ""}
                    onChange={(e) =>
                      setLocal({
                        ...local,
                        elyOAuthClientSecret: e.target.value || null,
                      })
                    }
                    autoComplete="off"
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {settingsTab === "about" && (
          <div className="settings-grid">
            <section className="settings-card settings-about-card span-2">
              <img className="settings-about-mark" src="/horizonui.png" alt="" />
              <div className="settings-about-copy">
                <span className="settings-version-badge">v{appVersion}</span>
                <h3>HorizonUI Launcher</h3>
                <p>
                  Minecraft launcher for HorizonUI.
                </p>
                <div className="settings-about-actions">
                  {launcherUpdate ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => api.openUrl(launcherUpdate.url)}
                    >
                      <Icon name="download" size={14} />
                      Download v{launcherUpdate.version}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={checkingUpdate}
                      onClick={() => {
                        setCheckingUpdate(true);
                        void checkForUpdates().finally(() => {
                          setCheckingUpdate(false);
                          setUpdateChecked(true);
                        });
                      }}
                    >
                      {checkingUpdate ? "Checking…" : "Check for updates"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      api.openUrl("https://github.com/nokarin-dev/HorizonUI-Launcher")
                    }
                  >
                    GitHub
                  </button>
                </div>
                {!launcherUpdate && updateChecked && (
                  <p className="field-hint">You are on the latest version.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {dirty && (
        <div className="settings-save-bar">
          <span>You have unsaved launcher settings.</span>
          {saveButton}
        </div>
      )}
    </div>
  );
}
