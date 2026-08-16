export interface McVersionSupport {
  version: string;
  loaders: string[];
  java: number;
  modVersion: string;
  groupLabel: string;
}

export interface McVersionGroup {
  id: string;
  label: string;
  modVersion: string;
  versions: string[];
  loaders: string[];
  java: number;
}

export interface Profile {
  id: string;
  name: string;
  mcVersion: string;
  loader: string;
  ramMb: number;
  javaPath?: string | null;
  createdAt: string;
  lastPlayed?: string | null;
  playTimeMs?: number;
  installed: boolean;
  category: string;
}

export interface LauncherSettings {
  defaultRamMb: number;
  closeOnLaunch: boolean;
  theme: string;
  curseforgeApiKey?: string | null;
  microsoftOAuthClientId?: string | null;
  elyOAuthClientId?: string | null;
  elyOAuthClientSecret?: string | null;
  animatedBackgrounds?: boolean;
}

export interface JavaInstallation {
  path: string;
  version: number;
  vendor: string;
}

export interface HorizonDisplayOptions {
  showHealth: boolean;
  showArmor: boolean;
  showLevel: boolean;
  showTime: boolean;
  showBiome: boolean;
  showDimension: boolean;
  showParty: boolean;
  showHead: boolean;
  dynamicImages: boolean;
  useTemplates: boolean;
  activeTemplate: string;
  timeFormat: string;
}

export interface HorizonPrivacySettings {
  showCoordinates: boolean;
  showServerIp: boolean;
  showServerName: boolean;
  showPlayerCount: boolean;
  showWorldName: boolean;
  obfuscateInHardcore: boolean;
  hideWhileAfk: boolean;
  autoDetectActivity: boolean;
  detectAfk: boolean;
  autoDetection: number;
  afkTimeout: number;
  coordinatePrecision: number;
}

export interface HorizonDiscordRpc {
  enabled: boolean;
  updateInterval: number;
  display: HorizonDisplayOptions;
  privacy: HorizonPrivacySettings;
}

export interface HorizonConfig {
  backgroundFrame: number;
  background: string;
  agreedToTerms: boolean;
  autoUpdater: boolean;
  discordRpc: HorizonDiscordRpc;
}

export interface ModrinthRelease {
  version: string;
  versionId: string;
  filename: string;
  downloadUrl: string;
}

export interface ModDownloadSelection {
  modId: string;
  versionId: string;
  source: string;
  title: string;
  versionName: string;
  filename: string;
  downloadUrl: string;
  sizeBytes: number;
}

export interface ModDownloadPlanItem {
  modId: string;
  versionId: string;
  source: string;
  title: string;
  versionName: string;
  filename: string;
  downloadUrl: string;
  sizeBytes: number;
  requiredBy?: string | null;
  isDependency: boolean;
  alreadyInstalled: boolean;
}

export interface InstalledMod {
  filename: string;
  sizeBytes: number;
}

export interface ModSearchResult {
  id: string;
  slug: string;
  title: string;
  description: string;
  iconUrl?: string | null;
  author: string;
  downloads: number;
  source: string;
  installed: boolean;
}

export interface ModBrowsePage {
  results: ModSearchResult[];
  offset: number;
  limit: number;
  totalHits: number;
  hasMore: boolean;
}

export interface ModVersionFile {
  filename: string;
  downloadUrl: string;
  sizeBytes: number;
}

export interface ModVersionInfo {
  id: string;
  name: string;
  files: ModVersionFile[];
  installed: boolean;
}

export type ModSource = "modrinth" | "curseforge";

export type ModSort =
  | "downloads"
  | "newest"
  | "updated"
  | "relevance"
  | "popularity"
  | "name";

export interface InstallProgress {
  stage: string;
  percent: number;
  message: string;
  currentFile?: string | null;
  itemIndex?: number | null;
  itemTotal?: number | null;
  bytesDownloaded?: number | null;
  bytesTotal?: number | null;
}

export interface InstallLogEntry {
  message: string;
  level: "info" | "success" | "error";
}

export interface GameLogEntry {
  message: string;
  level: "info" | "success" | "error" | "warn";
}

export interface ChangelogEntry {
  mcVersion: string;
  version: string;
  message: string;
}

export interface ChangelogFeed {
  homepage: string;
  entries: ChangelogEntry[];
}

export interface BackgroundAsset {
  name: string;
  path?: string | null;
  frames?: string[];
  isBuiltin: boolean;
}

export interface LauncherUpdateInfo {
  version: string;
  url: string;
  notes?: string | null;
}

export interface AuthAccount {
  username: string;
  uuid: string;
  accessToken: string;
  refreshToken?: string | null;
  authType?: "microsoft" | "elyby" | "offline";
  clientToken?: string | null;
}

export interface AccountsStore {
  accounts: AuthAccount[];
  activeAccountId: string | null;
}

export interface DeviceCodeSession {
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string | null;
  message?: string;
  deviceCode: string;
  interval: number;
  expiresIn: number;
}

export type PageId = "play" | "instance" | "settings";

export type SettingsTabId = "account" | "defaults" | "java" | "data" | "about";
