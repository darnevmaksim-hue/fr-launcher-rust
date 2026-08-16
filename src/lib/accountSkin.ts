import type { AuthAccount } from "./types";

export function authTypeLabel(authType?: string): string {
  switch (authType) {
    case "microsoft":
      return "Microsoft";
    case "elyby":
      return "Ely.by";
    case "offline":
      return "Offline";
    default:
      return "Microsoft";
  }
}

export function accountSkinUrl(account: AuthAccount, size = 32): string {
  const id = account.uuid.replace(/-/g, "");
  return `https://mc-heads.net/avatar/${id}/${size}`;
}
