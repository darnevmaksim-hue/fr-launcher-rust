import { invoke } from "@tauri-apps/api/core";
import type {
  AccountsStore,
  AuthAccount,
  BackgroundAsset,
  ChangelogFeed,
  DeviceCodeSession,
  HorizonConfig,
  GameLogEntry,
  InstalledMod,
  JavaInstallation,
  LauncherSettings,
  LauncherUpdateInfo,
  McVersionGroup,
  McVersionSupport,
  ModBrowsePage,
  ModSearchResult,
  ModSort,
  ModSource,
  ModVersionInfo,
  ModDownloadPlanItem,
  ModDownloadSelection,
  ModrinthRelease,
  Profile,
} from "./types";

export const api = {
  getSupportedVersions: () =>
    invoke<McVersionSupport[]>("get_supported_versions"),

  getSupportedVersionGroups: () =>
    invoke<McVersionGroup[]>("get_supported_version_groups"),

  getLauncherSettings: () =>
    invoke<LauncherSettings>("get_launcher_settings"),

  saveLauncherSettings: (settings: LauncherSettings) =>
    invoke<void>("save_launcher_settings", { settings }),

  curseforgeAvailable: () => invoke<boolean>("curseforge_available"),

  listProfiles: () => invoke<Profile[]>("list_profiles"),

  createProfile: (
    name: string,
    mcVersion: string,
    loader: string,
    ramMb?: number,
    category?: string,
  ) =>
    invoke<Profile>("create_profile", {
      name,
      mcVersion,
      loader,
      ramMb,
      category,
    }),

  updateProfile: (profile: Profile) =>
    invoke<Profile>("update_profile", { profile }),

  deleteProfile: (profileId: string) =>
    invoke<void>("delete_profile", { profileId }),

  detectJava: () =>
    invoke<JavaInstallation[]>("detect_java_installations"),

  readHorizonConfig: (profileId: string) =>
    invoke<HorizonConfig>("read_horizon_config", { profileId }),

  writeHorizonConfig: (profileId: string, configData: HorizonConfig) =>
    invoke<void>("write_horizon_config", {
      profileId,
      configData,
    }),

  openInstanceFolder: (profileId: string) =>
    invoke<void>("open_instance_folder", { profileId }),

  openModsFolder: (profileId: string) =>
    invoke<void>("open_mods_folder", { profileId }),

  installInstance: (profileId: string) =>
    invoke<Profile>("install_instance", { profileId }),

  cancelInstall: () => invoke<void>("cancel_install"),

  killGame: () => invoke<void>("kill_game"),

  isGameRunning: () => invoke<boolean>("is_game_running"),

  launchInstance: (profileId: string) =>
    invoke<number>("launch_instance", { profileId }),

  fetchHorizonRelease: (mcVersion: string, loader: string) =>
    invoke<ModrinthRelease>("fetch_horizonui_release_info", {
      mcVersion,
      loader,
    }),

  fetchChangelog: () => invoke<ChangelogFeed>("fetch_changelog"),

  checkLauncherUpdate: () =>
    invoke<LauncherUpdateInfo | null>("check_launcher_update"),

  getAccount: () => invoke<AuthAccount | null>("get_account"),

  listAccounts: () => invoke<AccountsStore>("list_accounts"),

  switchAccount: (accountId: string) =>
    invoke<AuthAccount>("switch_account", { accountId }),

  removeAccount: (accountId: string) =>
    invoke<void>("remove_account", { accountId }),

  cancelLogin: () => invoke<void>("cancel_login"),

  loginMicrosoftBrowser: () => invoke<AuthAccount>("login_microsoft_browser"),

  loginElybyBrowser: () => invoke<AuthAccount>("login_elyby_browser"),

  beginMicrosoftLogin: () => invoke<DeviceCodeSession>("begin_microsoft_login"),

  completeMicrosoftLogin: (session: DeviceCodeSession) =>
    invoke<AuthAccount>("complete_microsoft_login", { session }),

  beginElyLogin: () => invoke<DeviceCodeSession>("begin_ely_login"),

  completeElyLogin: (session: DeviceCodeSession) =>
    invoke<AuthAccount>("complete_ely_login", { session }),

  loginElyby: (username: string, password: string, totp?: string) =>
    invoke<AuthAccount>("login_elyby", {
      username,
      password,
      totp: totp || null,
    }),

  loginOffline: (username: string) =>
    invoke<AuthAccount>("login_offline", { username }),

  logoutAccount: () => invoke<void>("logout_account"),

  listBackgrounds: (profileId: string) =>
    invoke<BackgroundAsset[]>("list_backgrounds", { profileId }),

  readLocalImage: (path: string) => invoke<number[]>("read_local_image", { path }),

  exportProfiles: () => invoke<string>("export_profiles"),

  importProfiles: () => invoke<number>("import_profiles"),

  openUrl: (url: string) => invoke<void>("open_url", { url }),

  listInstalledMods: (profileId: string) =>
    invoke<InstalledMod[]>("list_installed_mods", { profileId }),

  browseMods: (
    profileId: string,
    query: string,
    source: ModSource,
    offset: number,
    limit: number,
    sort: ModSort,
  ) =>
    invoke<ModBrowsePage>("browse_mods", {
      profileId,
      query,
      source,
      offset,
      limit,
      sort,
    }),

  searchMods: (profileId: string, query: string, source: ModSource) =>
    invoke<ModSearchResult[]>("search_mods", {
      profileId,
      query,
      source,
    }),

  getModVersions: (
    profileId: string,
    modId: string,
    source: ModSource,
  ) =>
    invoke<ModVersionInfo[]>("get_mod_versions", {
      profileId,
      modId,
      source,
    }),

  installMod: (
    profileId: string,
    downloadUrl: string,
    filename: string,
  ) =>
    invoke<void>("install_mod", {
      profileId,
      downloadUrl,
      filename,
    }),

  planModDownloads: (
    profileId: string,
    selections: ModDownloadSelection[],
  ) =>
    invoke<ModDownloadPlanItem[]>("plan_mod_downloads", {
      profileId,
      selections,
    }),

  installModsBatch: (
    profileId: string,
    items: ModDownloadPlanItem[],
  ) =>
    invoke<number>("install_mods_batch", {
      profileId,
      items,
    }),

  removeMod: (profileId: string, filename: string) =>
    invoke<void>("remove_mod", { profileId, filename }),

  resolveAccountAvatar: (account: AuthAccount, size?: number) =>
    invoke<string>("resolve_account_avatar", { account, size }),

  readGameLog: (profileId: string, maxLines?: number) =>
    invoke<GameLogEntry[]>("read_game_log", {
      profileId,
      maxLines: maxLines ?? 10000,
    }),

  logDir: () => invoke<string>("log_dir"),

  logFile: () => invoke<string>("log_file"),

  openLogFolder: () => invoke<void>("open_log_folder"),
};
