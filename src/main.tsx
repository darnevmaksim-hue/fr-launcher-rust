import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initLogger } from "./lib/logger";
import { useLauncherStore } from "./store/launcherStore";

async function boot() {
  await initLogger();

  useLauncherStore.subscribe((state, prev) => {
    if (state.error && state.error !== prev.error) {
      console.error(state.error);
    }
  });

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void boot();
