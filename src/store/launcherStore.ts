import { listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { create } from "zustand";
import { api } from "../lib/api";
import type {
  AccountsStore,
  AuthAccount,
  BackgroundAsset,
  ChangelogFeed,
  DeviceCodeSession,
  HorizonConfig,
  InstallProgress,
  InstallLogEntry,
  GameLogEntry,
  JavaInstallation,
  LauncherSettings,
  LauncherUpdateInfo,
  McVersionSupport,
  McVersionGroup,
  ModDownloadPlanItem,
  ModDownloadSelection,
  ModSearchResult,
  ModSort,
  ModSource,
  InstalledMod,
  PageId,
  Profile,
  SettingsTabId,
} from "../lib/types";

interface LauncherState {
  page: PageId;
  profiles: Profile[];
  selectedProfileId: string | null;
  supportedVersions: McVersionSupport[];
  versionGroups: McVersionGroup[];
  launcherSettings: LauncherSettings | null;
  javaInstallations: JavaInstallation[];
  javaLoading: boolean;
  horizonConfig: HorizonConfig | null;
  backgrounds: BackgroundAsset[];
  changelog: ChangelogFeed | null;
  account: AuthAccount | null;
  accounts: AuthAccount[];
  activeAccountId: string | null;
  launcherUpdate: LauncherUpdateInfo | null;
  appVersion: string;
  loading: boolean;
  busyAction: string | null;
  error: string | null;
  statusMessage: string | null;
  installProgress: InstallProgress | null;
  installLogs: InstallLogEntry[];
  gameRunning: boolean;
  gamePid: number | null;
  launchLogs: GameLogEntry[];
  deviceLoginPending: {
    provider: "microsoft" | "elyby";
    mode: "browser" | "device";
    session?: DeviceCodeSession;
    deviceLink?: string;
  } | null;
  sidebarExpanded: boolean;
  settingsTab: SettingsTabId;

  setPage: (page: PageId) => void;
  setSettingsTab: (tab: SettingsTabId) => void;
  openAccountSettings: () => void;
  openInstance: (id: string) => void;
  selectProfile: (id: string | null) => void;
  toggleSidebar: () => void;
  clearError: () => void;
  clearStatusMessage: () => void;
  bootstrap: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  createProfile: (
    name: string,
    mcVersion: string,
    loader: string,
    ramMb?: number,
    category?: string,
  ) => Promise<void>;
  updateProfile: (profile: Profile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  updateProfileRam: (id: string, ramMb: number) => Promise<void>;
  installSelected: () => Promise<void>;
  cancelInstall: () => void;
  launchSelected: () => Promise<void>;
  killGame: () => void;
  loadHorizonConfig: () => Promise<void>;
  loadBackgrounds: () => Promise<void>;
  saveHorizonConfig: (config: HorizonConfig) => Promise<void>;
  saveLauncherSettings: (settings: LauncherSettings) => Promise<void>;
  loadJavaInstallations: () => Promise<void>;
  openInstanceFolder: () => Promise<void>;
  openModsFolder: () => Promise<void>;
  loadChangelog: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  startMicrosoftLogin: () => Promise<void>;
  loginMicrosoftBrowser: () => Promise<void>;
  loginMicrosoftDevice: () => Promise<void>;
  completeMicrosoftLogin: () => Promise<void>;
  loginElybyBrowser: () => Promise<void>;
  loginElybyDevice: () => Promise<void>;
  loginElyby: (username: string, password: string, totp?: string) => Promise<void>;
  loginOffline: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  cancelDeviceLogin: () => void;
  switchAccount: (accountId: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
  exportProfiles: () => Promise<void>;
  importProfiles: () => Promise<void>;
  previewSrc: (path?: string | null) => string | null;
  syncProfileTheme: () => Promise<void>;
  browseMods: (
    query: string,
    source: ModSource,
    sort: ModSort,
    append?: boolean,
  ) => Promise<void>;
  loadInstalledMods: () => Promise<void>;
  installModFile: (
    downloadUrl: string,
    filename: string,
  ) => Promise<void>;
  planModDownloads: (
    selections: ModDownloadSelection[],
  ) => Promise<ModDownloadPlanItem[]>;
  installModsBatch: (items: ModDownloadPlanItem[]) => Promise<number>;
  syncLaunchLogsFromFile: () => Promise<void>;
  removeModFile: (filename: string) => Promise<void>;
  installedMods: InstalledMod[];
  modBrowseResults: ModSearchResult[];
  modBrowseHasMore: boolean;
  modBrowseTotal: number;
  modBrowseOffset: number;
  modBrowseLoading: boolean;
}

let progressUnlisten: (() => void) | null = null;
let installLogUnlisten: (() => void) | null = null;
let gameLogUnlisten: (() => void) | null = null;
let gameExitUnlisten: (() => void) | null = null;
let listenersInit: Promise<void> | null = null;
let pendingGameLogs: GameLogEntry[] = [];
let gameLogFlushTimer: ReturnType<typeof setTimeout> | null = null;

function flushGameLogs(
  set: (
    partial:
      | Partial<LauncherState>
      | ((state: LauncherState) => Partial<LauncherState>),
  ) => void,
) {
  if (pendingGameLogs.length === 0) return;
  const batch = pendingGameLogs;
  pendingGameLogs = [];
  set((s) => ({
    launchLogs: [...s.launchLogs, ...batch].slice(-10000),
  }));
}

async function ensureEventListeners(
  set: (
    partial:
      | Partial<LauncherState>
      | ((state: LauncherState) => Partial<LauncherState>),
  ) => void,
  get: () => LauncherState,
) {
  if (!listenersInit) {
    listenersInit = (async () => {
      if (!progressUnlisten) {
        progressUnlisten = await listen<InstallProgress>(
          "install-progress",
          (e) => set({ installProgress: e.payload }),
        );
      }
      if (!installLogUnlisten) {
        installLogUnlisten = await listen<InstallLogEntry>(
          "install-log",
          (e) =>
            set((s) => ({
              installLogs: [...s.installLogs, e.payload].slice(-250),
            })),
        );
      }
      if (!gameLogUnlisten) {
        gameLogUnlisten = await listen<GameLogEntry>("game-log", (e) => {
          pendingGameLogs.push(e.payload);
          if (!gameLogFlushTimer) {
            gameLogFlushTimer = setTimeout(() => {
              gameLogFlushTimer = null;
              flushGameLogs(set);
            }, 150);
          }
        });
      }
      if (!gameExitUnlisten) {
        gameExitUnlisten = await listen<{ profileId: string; exitCode: number }>(
          "game-exit",
          (e) => {
            const code = e.payload.exitCode;
            set({
              gameRunning: false,
              gamePid: null,
              busyAction: null,
              statusMessage:
                code === 0 ? "Game closed" : `Game exited (code ${code})`,
            });
            void get().refreshProfiles();
            void get().syncLaunchLogsFromFile();
            void getCurrentWindow().show().then(() => getCurrentWindow().setFocus());
          },
        );
      }
    })();
  }
  await listenersInit;
}
let loginAborted = false;

function activeFromStore(store: AccountsStore): AuthAccount | null {
  if (!store.activeAccountId) return null;
  return store.accounts.find((a) => a.uuid === store.activeAccountId) ?? null;
}

function applyAccountsStore(store: AccountsStore) {
  return {
    accounts: store.accounts,
    activeAccountId: store.activeAccountId,
    account: activeFromStore(store),
  };
}

const MS_DEVICE_LINK = "https://www.microsoft.com/link";
const ELY_DEVICE_LINK = "http://account.ely.by/code";

export const useLauncherStore = create<LauncherState>((set, get) => ({
  page: "play",
  profiles: [],
  selectedProfileId: null,
  supportedVersions: [],
  versionGroups: [],
  launcherSettings: null,
  javaInstallations: [],
  javaLoading: false,
  horizonConfig: null,
  backgrounds: [],
  changelog: null,
  account: null,
  accounts: [],
  activeAccountId: null,
  launcherUpdate: null,
  appVersion: "0.1.0",
  loading: true,
  busyAction: null,
  error: null,
  statusMessage: null,
  installProgress: null,
  installLogs: [],
  gameRunning: false,
  gamePid: null,
  launchLogs: [],
  deviceLoginPending: null,
  sidebarExpanded: true,
  settingsTab: "account",
  installedMods: [],
  modBrowseResults: [],
  modBrowseHasMore: false,
  modBrowseTotal: 0,
  modBrowseOffset: 0,
  modBrowseLoading: false,

  setPage: (page) => set({ page }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  openAccountSettings: () => set({ page: "settings", settingsTab: "account" }),
  openInstance: (id) => {
    set({ selectedProfileId: id, page: "instance" });
    get().syncProfileTheme();
    get().loadInstalledMods();
  },
  selectProfile: (id) => {
    set({ selectedProfileId: id });
    get().syncProfileTheme();
  },
  toggleSidebar: () => set({ sidebarExpanded: !get().sidebarExpanded }),
  clearError: () => set({ error: null }),
  clearStatusMessage: () => set({ statusMessage: null }),

  previewSrc: (path) => {
    if (!path) return null;
    try {
      return convertFileSrc(path);
    } catch {
      return null;
    }
  },

  bootstrap: async () => {
    set({ loading: true, error: null });
    try {
      await ensureEventListeners(set, get);

      const [profiles, versions, groups, settings, accountsStore, gameRunning, appVersion] =
        await Promise.all([
        api.listProfiles(),
        api.getSupportedVersions(),
        api.getSupportedVersionGroups(),
        api.getLauncherSettings(),
        api.listAccounts(),
        api.isGameRunning(),
        getVersion().catch(() => "0.1.0"),
      ]);
      const selected =
        get().selectedProfileId ?? profiles[0]?.id ?? null;
      set({
        profiles,
        supportedVersions: versions,
        versionGroups: groups,
        launcherSettings: settings,
        ...applyAccountsStore(accountsStore),
        selectedProfileId: selected,
        gameRunning,
        appVersion,
        loading: false,
      });
      get().loadChangelog();
      get().checkForUpdates();
      get().syncProfileTheme();
      void get().loadJavaInstallations();
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  refreshProfiles: async () => {
    const profiles = await api.listProfiles();
    set({ profiles });
  },

  createProfile: async (name, mcVersion, loader, ramMb, category) => {
    set({ busyAction: "create", error: null });
    try {
      const profile = await api.createProfile(
        name,
        mcVersion,
        loader,
        ramMb,
        category,
      );
      await get().refreshProfiles();
      set({
        selectedProfileId: profile.id,
        busyAction: null,
        statusMessage: `Profile "${name}" created`,
      });
      get().syncProfileTheme();
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  deleteProfile: async (id) => {
    set({ busyAction: "delete", error: null });
    try {
      await api.deleteProfile(id);
      const profiles = await api.listProfiles();
      const selected =
        get().selectedProfileId === id
          ? profiles[0]?.id ?? null
          : get().selectedProfileId;
      set({ profiles, selectedProfileId: selected, busyAction: null });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  updateProfile: async (profile) => {
    set({ busyAction: "update-profile", error: null });
    try {
      const updated = await api.updateProfile(profile);
      set({
        profiles: get().profiles.map((p) => (p.id === updated.id ? updated : p)),
        busyAction: null,
        statusMessage: "Instance updated",
      });
      get().syncProfileTheme();
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  updateProfileRam: async (id, ramMb) => {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile || profile.ramMb === ramMb) return;
    try {
      const updated = await api.updateProfile({ ...profile, ramMb });
      set({
        profiles: get().profiles.map((p) => (p.id === id ? updated : p)),
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  installSelected: async () => {
    const id = get().selectedProfileId;
    if (!id) return;
    set({
      busyAction: "install",
      error: null,
      installLogs: [],
      installProgress: { stage: "prepare", percent: 0, message: "Starting…" },
    });
    try {
      const profile = await api.installInstance(id);
      set({
        profiles: get().profiles.map((p) => (p.id === id ? profile : p)),
        busyAction: null,
        installProgress: null,
        statusMessage: "Install complete",
      });
    } catch (e) {
      const msg = String(e);
      const cancelled = msg.toLowerCase().includes("cancel");
      set({
        busyAction: null,
        installProgress: null,
        error: cancelled ? null : msg,
        statusMessage: cancelled ? "Install cancelled" : null,
      });
    }
  },

  cancelInstall: () => {
    api.cancelInstall();
    set({ statusMessage: "Cancelling install…" });
  },

  launchSelected: async () => {
    const id = get().selectedProfileId;
    if (!id) return;
    if (get().gameRunning) return;
    set({
      busyAction: "launch",
      error: null,
      launchLogs: [],
    });
    try {
      const pid = await api.launchInstance(id);
      const settings = get().launcherSettings;
      set({
        gameRunning: true,
        gamePid: pid,
        busyAction: null,
        statusMessage: "Game launched",
      });
      await get().refreshProfiles();
      void get().syncLaunchLogsFromFile();
      if (settings?.closeOnLaunch) {
        void getCurrentWindow().hide();
      }
    } catch (e) {
      set({
        busyAction: null,
        gameRunning: false,
        gamePid: null,
        error: String(e),
      });
    }
  },

  killGame: () => {
    api.killGame();
    set({
      statusMessage: "Stopping game…",
    });
  },

  loadHorizonConfig: async () => {
    const id = get().selectedProfileId;
    if (!id) return;
    set({ loading: true });
    try {
      const config = await api.readHorizonConfig(id);
      set({ horizonConfig: config, loading: false });
      await get().loadBackgrounds();
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  loadBackgrounds: async () => {
    const id = get().selectedProfileId;
    if (!id) return;
    try {
      const backgrounds = await api.listBackgrounds(id);
      set({ backgrounds });
    } catch {
      set({ backgrounds: [] });
    }
  },

  syncProfileTheme: async () => {
    const id = get().selectedProfileId;
    if (!id) {
      set({ horizonConfig: null, backgrounds: [] });
      return;
    }
    try {
      const [config, backgrounds] = await Promise.all([
        api.readHorizonConfig(id),
        api.listBackgrounds(id),
      ]);
      set({ horizonConfig: config, backgrounds });
    } catch {
      set({ horizonConfig: null, backgrounds: [] });
    }
  },

  saveHorizonConfig: async (config) => {
    const id = get().selectedProfileId;
    if (!id) return;
    set({ busyAction: "save-config", error: null });
    try {
      await api.writeHorizonConfig(id, config);
      set({
        horizonConfig: config,
        busyAction: null,
        statusMessage: "HorizonUI config saved",
      });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  saveLauncherSettings: async (settings) => {
    set({ busyAction: "save-settings", error: null });
    try {
      await api.saveLauncherSettings(settings);
      set({
        launcherSettings: settings,
        busyAction: null,
        statusMessage: "Launcher settings saved",
      });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  loadJavaInstallations: async () => {
    if (get().javaLoading || get().javaInstallations.length > 0) return;
    set({ javaLoading: true });
    try {
      const javaInstallations = await api.detectJava();
      set({ javaInstallations, javaLoading: false });
    } catch {
      set({ javaLoading: false, javaInstallations: [] });
    }
  },

  openInstanceFolder: async () => {
    const id = get().selectedProfileId;
    if (!id) return;
    try {
      await api.openInstanceFolder(id);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  openModsFolder: async () => {
    const id = get().selectedProfileId;
    if (!id) return;
    try {
      await api.openModsFolder(id);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadChangelog: async () => {
    try {
      const changelog = await api.fetchChangelog();
      set({ changelog });
    } catch {
      set({ changelog: null });
    }
  },

  checkForUpdates: async () => {
    try {
      const update = await api.checkLauncherUpdate();
      set({ launcherUpdate: update });
    } catch {
      set({ launcherUpdate: null });
    }
  },

  refreshAccounts: async () => {
    try {
      const store = await api.listAccounts();
      set(applyAccountsStore(store));
    } catch {
      set({ accounts: [], activeAccountId: null, account: null });
    }
  },

  cancelDeviceLogin: () => {
    loginAborted = true;
    api.cancelLogin();
    set({ deviceLoginPending: null, busyAction: null });
  },

  switchAccount: async (accountId) => {
    set({ busyAction: "switch-account", error: null });
    try {
      const account = await api.switchAccount(accountId);
      const store = await api.listAccounts();
      set({
        ...applyAccountsStore(store),
        account,
        busyAction: null,
        statusMessage: `Active account: ${account.username}`,
      });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  removeAccount: async (accountId) => {
    set({ busyAction: "remove-account", error: null });
    try {
      await api.removeAccount(accountId);
      const store = await api.listAccounts();
      set({
        ...applyAccountsStore(store),
        busyAction: null,
        statusMessage: "Account removed",
      });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  startMicrosoftLogin: async () => {
    await get().loginMicrosoftBrowser();
  },

  loginMicrosoftBrowser: async () => {
    loginAborted = false;
    set({
      busyAction: "ms-login",
      error: null,
      deviceLoginPending: { provider: "microsoft", mode: "browser" },
    });
    try {
      const account = await api.loginMicrosoftBrowser();
      if (loginAborted) return;
      const store = await api.listAccounts();
      set({
        ...applyAccountsStore(store),
        account,
        deviceLoginPending: null,
        busyAction: null,
        statusMessage: `Signed in as ${account.username}`,
      });
    } catch (e) {
      if (loginAborted) return;
      set({ busyAction: null, deviceLoginPending: null, error: String(e) });
    }
  },

  loginMicrosoftDevice: async () => {
    loginAborted = false;
    set({ busyAction: "ms-login", error: null, deviceLoginPending: null });
    try {
      const session = await api.beginMicrosoftLogin();
      if (loginAborted) return;
      set({
        deviceLoginPending: {
          provider: "microsoft",
          mode: "device",
          session,
          deviceLink: MS_DEVICE_LINK,
        },
        busyAction: "ms-login",
      });
      const openUrl =
        session.verificationUriComplete ?? session.verificationUri;
      await api.openUrl(openUrl);
      const account = await api.completeMicrosoftLogin(session);
      if (loginAborted) return;
      const store = await api.listAccounts();
      set({
        ...applyAccountsStore(store),
        account,
        deviceLoginPending: null,
        busyAction: null,
        statusMessage: `Signed in as ${account.username}`,
      });
    } catch (e) {
      if (loginAborted) return;
      set({ busyAction: null, deviceLoginPending: null, error: String(e) });
    }
  },

  completeMicrosoftLogin: async () => {
    const pending = get().deviceLoginPending;
    if (!pending || pending.provider !== "microsoft" || !pending.session) return;
    set({ busyAction: "ms-login", error: null });
    try {
      const account = await api.completeMicrosoftLogin(pending.session);
      if (loginAborted) return;
      const store = await api.listAccounts();
      set({
        ...applyAccountsStore(store),
        account,
        deviceLoginPending: null,
        busyAction: null,
        statusMessage: `Signed in as ${account.username}`,
      });
    } catch (e) {
      if (loginAborted) return;
      set({ busyAction: null, error: String(e) });
    }
  },

  loginElybyBrowser: async () => {
    loginAborted = false;
    set({
      busyAction: "ely-login",
      error: null,
      deviceLoginPending: { provider: "elyby", mode: "browser" },
    });
    try {
      const account = await api.loginElybyBrowser();
      if (loginAborted) return;
      const store = await api.listAccounts();
      set({
        ...applyAccountsStore(store),
        account,
        deviceLoginPending: null,
        busyAction: null,
        statusMessage: `Signed in as ${account.username} (Ely.by)`,
      });
    } catch (e) {
      if (loginAborted) return;
      set({ busyAction: null, deviceLoginPending: null, error: String(e) });
    }
  },

  loginElybyDevice: async () => {
    loginAborted = false;
    set({ busyAction: "ely-login", error: null, deviceLoginPending: null });
    try {
      const session = await api.beginElyLogin();
      if (loginAborted) return;
      set({
        deviceLoginPending: {
          provider: "elyby",
          mode: "device",
          session,
          deviceLink: ELY_DEVICE_LINK,
        },
        busyAction: "ely-login",
      });
      const openUrl =
        session.verificationUriComplete ?? session.verificationUri;
      await api.openUrl(openUrl);
      const account = await api.completeElyLogin(session);
      if (loginAborted) return;
      const store = await api.listAccounts();
      set({
        ...applyAccountsStore(store),
        account,
        deviceLoginPending: null,
        busyAction: null,
        statusMessage: `Signed in as ${account.username} (Ely.by)`,
      });
    } catch (e) {
      if (loginAborted) return;
      set({ busyAction: null, deviceLoginPending: null, error: String(e) });
    }
  },

  loginElyby: async (username, password, totp) => {
    set({ busyAction: "ely-login", error: null });
    try {
      const account = await api.loginElyby(username, password, totp);
      const store = await api.listAccounts();
      set({
        ...applyAccountsStore(store),
        account,
        busyAction: null,
        statusMessage: `Signed in as ${account.username} (Ely.by)`,
      });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  loginOffline: async (username) => {
    set({ busyAction: "offline-login", error: null });
    try {
      const account = await api.loginOffline(username);
      const store = await api.listAccounts();
      set({
        ...applyAccountsStore(store),
        account,
        busyAction: null,
        statusMessage: `Offline: ${account.username}`,
      });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  logout: async () => {
    await api.logoutAccount();
    const store = await api.listAccounts();
    set({
      ...applyAccountsStore(store),
      statusMessage: "Signed out",
    });
  },

  exportProfiles: async () => {
    set({ busyAction: "export", error: null });
    try {
      const path = await api.exportProfiles();
      set({
        busyAction: null,
        statusMessage: `Exported to ${path}`,
      });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  importProfiles: async () => {
    set({ busyAction: "import", error: null });
    try {
      const count = await api.importProfiles();
      await get().refreshProfiles();
      set({
        busyAction: null,
        statusMessage: `Imported ${count} file(s)`,
      });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  loadInstalledMods: async () => {
    const id = get().selectedProfileId;
    if (!id) return;
    try {
      const mods = await api.listInstalledMods(id);
      set({ installedMods: mods });
    } catch {
      set({ installedMods: [] });
    }
  },

  browseMods: async (query, source, sort, append = false) => {
    const id = get().selectedProfileId;
    if (!id) return;
    const offset = append ? get().modBrowseOffset : 0;
    set({ modBrowseLoading: true, error: null });
    try {
      const page = await api.browseMods(id, query, source, offset, 20, sort);
      const merged = append
        ? [...get().modBrowseResults, ...page.results]
        : page.results;
      set({
        modBrowseResults: merged,
        modBrowseOffset: page.offset,
        modBrowseHasMore: page.hasMore,
        modBrowseTotal: page.totalHits,
        modBrowseLoading: false,
      });
    } catch (e) {
      set({
        modBrowseLoading: false,
        error: String(e),
        ...(append
          ? {}
          : {
              modBrowseResults: [],
              modBrowseHasMore: false,
              modBrowseTotal: 0,
              modBrowseOffset: 0,
            }),
      });
    }
  },

  installModFile: async (downloadUrl, filename) => {
    const id = get().selectedProfileId;
    if (!id) return;
    set({ busyAction: "install-mod", error: null });
    try {
      await api.installMod(id, downloadUrl, filename);
      await get().loadInstalledMods();
      const installed = get().installedMods.map((m) => m.filename);
      set({
        busyAction: null,
        statusMessage: `Installed ${filename}`,
        modBrowseResults: get().modBrowseResults.map((r) => ({
          ...r,
          installed:
            r.installed ||
            installed.some((f) => f.includes(r.slug)),
        })),
      });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },

  planModDownloads: async (selections) => {
    const id = get().selectedProfileId;
    if (!id) return [];
    try {
      return await api.planModDownloads(id, selections);
    } catch (e) {
      set({ error: String(e) });
      return [];
    }
  },

  installModsBatch: async (items) => {
    const id = get().selectedProfileId;
    if (!id) return 0;
    set({ busyAction: "install-mod", error: null });
    try {
      const count = await api.installModsBatch(id, items);
      await get().loadInstalledMods();
      const installed = get().installedMods.map((m) => m.filename);
      set({
        busyAction: null,
        statusMessage:
          count > 0 ? `Installed ${count} mod(s)` : "No mods installed",
        modBrowseResults: get().modBrowseResults.map((r) => ({
          ...r,
          installed:
            r.installed ||
            installed.some((f) => f.includes(r.slug)),
        })),
      });
      return count;
    } catch (e) {
      set({ busyAction: null, error: String(e) });
      return 0;
    }
  },

  syncLaunchLogsFromFile: async () => {
    const id = get().selectedProfileId;
    if (!id) return;
    try {
      const logs = await api.readGameLog(id, 10000);
      if (logs.length > 0) {
        set({ launchLogs: logs });
      }
    } catch {
    }
  },

  removeModFile: async (filename) => {
    const id = get().selectedProfileId;
    if (!id) return;
    set({ busyAction: "remove-mod", error: null });
    try {
      await api.removeMod(id, filename);
      await get().loadInstalledMods();
      const installed = get().installedMods.map((m) => m.filename);
      set({
        busyAction: null,
        statusMessage: `Removed ${filename}`,
        modBrowseResults: get().modBrowseResults.map((r) => ({
          ...r,
          installed: installed.some((f) => f.includes(r.slug)),
        })),
      });
    } catch (e) {
      set({ busyAction: null, error: String(e) });
    }
  },
}));
