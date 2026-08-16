export function formatLoader(loader: string): string {
  switch (loader) {
    case "fabric":
      return "Fabric";
    case "quilt":
      return "Quilt";
    case "forge":
      return "Forge";
    case "neoforge":
      return "NeoForge";
    default:
      return loader;
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    prepare: "Preparing",
    minecraft: "Minecraft client",
    libraries: "Libraries",
    assets: "Game assets",
    fabric: "Fabric",
    quilt: "Quilt",
    forge: "Forge",
    neoforge: "NeoForge",
    mod: "HorizonUI mod",
    natives: "Native libraries",
    download: "Downloading",
    done: "Complete",
  };
  return labels[stage] ?? stage;
}

export function formatPlayTime(ms?: number | null): string {
  const value = Math.max(0, Math.floor(ms ?? 0));
  if (value < 60_000) return "< 1m";
  const totalMinutes = Math.floor(value / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatLastPlayed(value?: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";

  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) {
    const mins = Math.floor(diff / 60_000);
    return `${mins}m ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000);
    return `${hours}h ago`;
  }
  if (diff < 172_800_000) return "Yesterday";
  if (diff < 7 * 86_400_000) {
    const days = Math.floor(diff / 86_400_000);
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatModVersion(version: string): string {
  const raw = version.trim();
  if (!raw) return raw;
  const match = raw.match(/^v?(\d+(?:\.\d+)*)(?:-([a-zA-Z]+)(?:\.(\d+))?)?$/i);
  if (!match) {
    return raw.startsWith("v") ? raw.replace(/[-.]/g, " ") : `v${raw.replace(/[-.]/g, " ")}`;
  }
  const [, core, channel, number] = match;
  const label = core.startsWith("v") ? core : `v${core}`;
  if (!channel) return label;
  return number ? `${label} ${channel.toLowerCase()} ${number}` : `${label} ${channel.toLowerCase()}`;
}
