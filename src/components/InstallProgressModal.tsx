import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { formatBytes, formatStageLabel } from "../lib/format";
import { useLauncherStore } from "../store/launcherStore";

function byteProgressText(progress: {
  bytesDownloaded?: number | null;
  bytesTotal?: number | null;
}): string | null {
  const done = progress.bytesDownloaded;
  if (done == null) return null;
  const total = progress.bytesTotal;
  if (total != null && total > 0) {
    const pct = Math.min(100, Math.round((done / total) * 100));
    return `${formatBytes(done)} / ${formatBytes(total)} (${pct}%)`;
  }
  return formatBytes(done);
}

function itemProgressText(progress: {
  itemIndex?: number | null;
  itemTotal?: number | null;
}): string | null {
  if (progress.itemIndex != null && progress.itemTotal != null && progress.itemTotal > 0) {
    return `${progress.itemIndex} / ${progress.itemTotal}`;
  }
  return null;
}

export function InstallProgressModal() {
  const installProgress = useLauncherStore((s) => s.installProgress);
  const installLogs = useLauncherStore((s) => s.installLogs);
  const busyAction = useLauncherStore((s) => s.busyAction);
  const cancelInstall = useLauncherStore((s) => s.cancelInstall);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [installLogs.length]);

  if (busyAction !== "install" || !installProgress) return null;

  const bytesLine = byteProgressText(installProgress);
  const itemsLine = itemProgressText(installProgress);
  const stageLabel = formatStageLabel(installProgress.stage);

  return (
    <div className="install-modal-backdrop">
      <div className="install-modal glass-card">
        <div className="install-modal-header">
          <div>
            <p className="install-modal-eyebrow">Installing instance</p>
            <h3>{installProgress.message}</h3>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm install-cancel-btn"
            onClick={cancelInstall}
          >
            Cancel
          </button>
        </div>

        <div className="install-progress-block">
          <div className="install-progress-meta">
            <span className="install-stage-pill">{stageLabel}</span>
            <span className="install-percent">{installProgress.percent}%</span>
          </div>
          <div className="progress-bar install-progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${installProgress.percent}%` }}
            />
          </div>
        </div>

        <div className="install-detail-grid">
          {installProgress.currentFile && (
            <div className="install-detail-item">
              <span className="install-detail-label">Current file</span>
              <span className="install-detail-value" title={installProgress.currentFile}>
                {installProgress.currentFile}
              </span>
            </div>
          )}
          {itemsLine && (
            <div className="install-detail-item">
              <span className="install-detail-label">Progress</span>
              <span className="install-detail-value">{itemsLine}</span>
            </div>
          )}
          {bytesLine && (
            <div className="install-detail-item">
              <span className="install-detail-label">Downloaded</span>
              <span className="install-detail-value accent">{bytesLine}</span>
            </div>
          )}
        </div>

        <div className="install-log-panel">
          <div className="install-log-header">
            <span>Activity log</span>
            <span className="install-log-count">{installLogs.length} entries</span>
          </div>
          <div className="install-log-scroll">
            {installLogs.length === 0 ? (
              <p className="install-log-empty">Waiting for download activity…</p>
            ) : (
              installLogs.map((entry, i) => (
                <div key={i} className={`install-log-line level-${entry.level}`}>
                  {entry.message}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        <div className="install-modal-footer">
          <Icon name="diamond" size={14} />
          <span>Large files may take a while — progress updates every few KB.</span>
        </div>
      </div>
    </div>
  );
}
