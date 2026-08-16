import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon } from "./Icon";
import { useLauncherStore } from "../store/launcherStore";

export function TitleBar() {
  const win = getCurrentWindow();
  const appVersion = useLauncherStore((s) => s.appVersion);

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand" data-tauri-drag-region>
        <img className="titlebar-mark" src="/horizonui.png" alt="" />
        <span className="titlebar-name">HorizonUI Launcher</span>
        <span className="titlebar-version">v{appVersion}</span>
      </div>
      <div className="titlebar-controls">
        <button
          type="button"
          className="titlebar-btn"
          onClick={() => win.minimize()}
          title="Minimize"
        >
          <Icon name="minimize" size={14} />
        </button>
        <button
          type="button"
          className="titlebar-btn"
          onClick={() => win.toggleMaximize()}
          title="Maximize"
        >
          <Icon name="maximize" size={14} />
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-btn-close"
          onClick={() => win.close()}
          title="Close"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </header>
  );
}
