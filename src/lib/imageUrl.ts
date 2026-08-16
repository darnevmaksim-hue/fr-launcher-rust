import { convertFileSrc } from "@tauri-apps/api/core";
import { api } from "./api";

const urlCache = new Map<string, string>();

export function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    default:
      return "image/png";
  }
}

export function fileSrc(path: string): string {
  return convertFileSrc(path);
}

export function isGifPath(path: string): boolean {
  return path.toLowerCase().endsWith(".gif");
}

export function needsBlobSrc(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ext !== "png";
}

export function clearImageUrlCache() {
  for (const url of urlCache.values()) {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }
  urlCache.clear();
}

export async function fileToBlob(path: string): Promise<Blob> {
  const mime = mimeFromPath(path);
  try {
    const res = await fetch(convertFileSrc(path));
    if (res.ok) {
      const buf = await res.arrayBuffer();
      return new Blob([new Uint8Array(buf)], { type: mime });
    }
  } catch {
  }
  const bytes = Uint8Array.from(await api.readLocalImage(path));
  return new Blob([Uint8Array.from(bytes)], { type: mime });
}

export async function filePathToUrl(path: string): Promise<string> {
  const cached = urlCache.get(path);
  if (cached) return cached;
  const blob = await fileToBlob(path);
  const url = URL.createObjectURL(blob);
  urlCache.set(path, url);
  return url;
}

export async function displaySrc(path: string): Promise<string> {
  if (!needsBlobSrc(path)) return fileSrc(path);
  return filePathToUrl(path);
}
