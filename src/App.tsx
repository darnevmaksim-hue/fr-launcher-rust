import { useEffect } from "react";
import { InstallProgressModal } from "./components/InstallProgressModal";
import { Layout } from "./components/Layout";
import { PlayPage } from "./pages/PlayPage";
import { InstancePage } from "./pages/InstancePage";
import { LauncherSettingsPage } from "./pages/LauncherSettingsPage";
import { useLauncherStore } from "./store/launcherStore";
import "./styles/global.css";

function App() {
  const { page, setPage, bootstrap, loading } = useLauncherStore();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      event.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  return (
    <>
      <Layout
        page={page}
        onNavigate={setPage}
        loading={loading && page === "play"}
      >
        <div className={`page-pane${page === "play" ? " is-active" : ""}`}>
          <PlayPage />
        </div>
        <div className={`page-pane${page === "instance" ? " is-active" : ""}`}>
          <InstancePage />
        </div>
        <div className={`page-pane${page === "settings" ? " is-active" : ""}`}>
          <LauncherSettingsPage />
        </div>
      </Layout>
      <InstallProgressModal />
    </>
  );
}

export default App;
