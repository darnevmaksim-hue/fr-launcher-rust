import type { ReactNode } from "react";
import { LauncherBackground } from "./LauncherBackground";
import { Sidebar } from "./Sidebar";
import { StatusToast } from "./StatusToast";
import { TitleBar } from "./TitleBar";
import { WindowResizeHandles } from "./WindowResizeHandles";
import { DeviceCodePrompt } from "./DeviceCodePrompt";
import { useWindowMaximized } from "../hooks/useWindowMaximized";
import { useLauncherStore } from "../store/launcherStore";
import type { PageId } from "../lib/types";

interface LayoutProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
  loading?: boolean;
}

export function Layout({ page, onNavigate, children, loading }: LayoutProps) {
  const sidebarExpanded = useLauncherStore((s) => s.sidebarExpanded);
  const deviceLoginPending = useLauncherStore((s) => s.deviceLoginPending);
  const maximized = useWindowMaximized();

  return (
    <div
      className={`app-shell${maximized ? " maximized" : " rounded-window"}`}
      data-page={page}
      data-sidebar-expanded={sidebarExpanded ? "true" : "false"}
    >
      <LauncherBackground />
      <div className="app-shell-overlay" />
      {!maximized && <WindowResizeHandles />}
      <TitleBar />

      <div className="app-shell-inner">
        <Sidebar page={page} onNavigate={onNavigate} />
        <main className="main-content" data-page={page}>
          <div className="page-shell">{children}</div>
        </main>
      </div>

      {deviceLoginPending && (
        <div className="device-code-overlay">
          <div className="device-code-card panel">
            <DeviceCodePrompt
              provider={deviceLoginPending.provider}
              mode={deviceLoginPending.mode}
              session={deviceLoginPending.session}
              deviceLink={deviceLoginPending.deviceLink}
            />
            <div className="spinner device-code-spinner" />
            <button
              type="button"
              className="btn btn-ghost btn-sm device-code-cancel"
              onClick={() => useLauncherStore.getState().cancelDeviceLogin()}
            >
              Cancel sign-in
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      )}
      <StatusToast />
    </div>
  );
}
