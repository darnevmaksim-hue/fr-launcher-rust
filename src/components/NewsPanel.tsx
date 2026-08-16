import { api } from "../lib/api";
import { formatModVersion } from "../lib/format";
import { useLauncherStore } from "../store/launcherStore";

export function NewsPanel() {
  const changelog = useLauncherStore((s) => s.changelog);

  if (!changelog || changelog.entries.length === 0) {
    return (
      <div className="news-panel empty">
        <p>Changelog will appear when online.</p>
      </div>
    );
  }

  return (
    <div className="news-panel">
      <div className="news-list">
        {changelog.entries.slice(0, 6).map((entry) => (
          <div key={entry.version} className="news-item">
            <div className="tag-row">
              <span className="tag tag-sm">{formatModVersion(entry.version)}</span>
            </div>
            <p>{entry.message}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="link-btn"
        onClick={() => api.openUrl(changelog.homepage)}
      >
        View all updates →
      </button>
    </div>
  );
}
