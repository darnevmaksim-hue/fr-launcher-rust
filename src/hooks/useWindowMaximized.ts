import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export function useWindowMaximized() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    let disposed = false;

    const sync = async () => {
      if (!disposed) {
        setMaximized(await win.isMaximized());
      }
    };

    sync();

    const unlistenPromise = win.onResized(() => {
      sync();
    });

    return () => {
      disposed = true;
      unlistenPromise.then((unlisten) => unlisten()).catch(() => undefined);
    };
  }, []);

  return maximized;
}
