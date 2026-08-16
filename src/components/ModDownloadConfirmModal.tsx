import type { ModDownloadPlanItem } from "../lib/types";
import { Modal } from "./Modal";

interface ModDownloadConfirmModalProps {
  open: boolean;
  plan: ModDownloadPlanItem[];
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ModDownloadConfirmModal({
  open,
  plan,
  loading,
  onConfirm,
  onClose,
}: ModDownloadConfirmModalProps) {
  const toDownload = plan.filter((item) => !item.alreadyInstalled);
  const totalBytes = toDownload.reduce((sum, item) => sum + item.sizeBytes, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm mod downloads"
      width="min(560px, 94vw)"
    >
      <div className="mod-download-confirm">
        {loading ? (
          <p className="meta-line">Resolving dependencies…</p>
        ) : toDownload.length === 0 ? (
          <p className="meta-line">
            All selected mods are already installed. Nothing to download.
          </p>
        ) : (
          <>
            <p className="mod-download-confirm-summary">
              {toDownload.length} mod(s) will be downloaded ({formatSize(totalBytes)}).
            </p>
            <ul className="mod-download-confirm-list">
              {toDownload.map((item) => (
                <li key={`${item.source}-${item.modId}`}>
                  <div className="mod-download-confirm-item">
                    <strong>{item.title}</strong>
                    <span className="meta-line">
                      {item.versionName} · {item.filename} · {formatSize(item.sizeBytes)}
                    </span>
                    {item.isDependency && item.requiredBy && (
                      <span className="mod-download-confirm-note">
                        Required by {item.requiredBy}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mod-download-confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || toDownload.length === 0}
            onClick={onConfirm}
          >
            Confirm download
          </button>
        </div>
      </div>
    </Modal>
  );
}
