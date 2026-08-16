import { convertFileSrc } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { accountSkinUrl } from "../lib/accountSkin";
import type { AuthAccount } from "../lib/types";

interface AccountSkinHeadProps {
  account: AuthAccount;
  className?: string;
  size?: number;
  title?: string;
}

const avatarCache = new Map<string, string>();

function avatarKey(account: AuthAccount, size: number): string {
  return `${account.authType}:${account.uuid}:${account.username}:${size}`;
}

export function AccountSkinHead({
  account,
  className,
  size = 32,
  title,
}: AccountSkinHeadProps) {
  const key = avatarKey(account, size);
  const [src, setSrc] = useState<string | null>(() => avatarCache.get(key) ?? null);

  useEffect(() => {
    let cancelled = false;
    const nextKey = avatarKey(account, size);
    const cached = avatarCache.get(nextKey);
    if (cached) {
      setSrc(cached);
      return;
    }

    const load = async () => {
      if (account.authType === "elyby") {
        try {
          const path = await api.resolveAccountAvatar(account, size);
          if (!cancelled) {
            const url = convertFileSrc(path);
            avatarCache.set(nextKey, url);
            setSrc(url);
          }
          return;
        } catch {
        }
      }

      if (!cancelled) {
        const url = accountSkinUrl(account, size);
        avatarCache.set(nextKey, url);
        setSrc(url);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [account.authType, account.uuid, account.username, size]);

  if (!src) {
    return <div className={`${className ?? ""} placeholder`} title={title} />;
  }

  return (
    <img
      className={className}
      src={src}
      alt=""
      width={size}
      height={size}
      title={title}
    />
  );
}
