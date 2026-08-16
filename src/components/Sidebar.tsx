import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { PageId } from "../lib/types";
import { AccountSkinHead } from "./AccountSkinHead";
import { authTypeLabel } from "../lib/accountSkin";
import { Icon } from "./Icon";
import { useLauncherStore } from "../store/launcherStore";

const NAV: { id: PageId; label: string; icon: "play" | "layers" | "settings" }[] = [
  { id: "play", label: "Library", icon: "play" },
  { id: "instance", label: "Instance", icon: "layers" },
  { id: "settings", label: "Settings", icon: "settings" },
];

interface SidebarProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
}

const sidebarEase = [0.22, 1, 0.36, 1] as const;

const sidebarTransition = {
  duration: 0.46,
  ease: sidebarEase,
};

function SlideLabel({
  show,
  children,
  className,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className="slide-label-clip">
      <AnimatePresence initial={false}>
        {show && (
          <motion.span
            key="label"
            className={className}
            initial={{ opacity: 0, x: 14 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: { duration: 0.32, ease: sidebarEase, delay: 0.08 },
            }}
            exit={{
              opacity: 0,
              x: -10,
              transition: { duration: 0.22, ease: sidebarEase },
            }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Sidebar({ page, onNavigate }: SidebarProps) {
  const account = useLauncherStore((s) => s.account);
  const selectedProfileId = useLauncherStore((s) => s.selectedProfileId);
  const expanded = useLauncherStore((s) => s.sidebarExpanded);
  const toggleSidebar = useLauncherStore((s) => s.toggleSidebar);
  const openAccountSettings = useLauncherStore((s) => s.openAccountSettings);
  const appVersion = useLauncherStore((s) => s.appVersion);

  return (
    <motion.aside
      className={`sidebar${expanded ? " expanded" : " collapsed"}`}
      initial={false}
      animate={{ width: expanded ? 228 : 76 }}
      transition={sidebarTransition}
    >
      <div className="brand">
        <div className="brand-mark">
          <img src="/horizonui.png" alt="" />
        </div>
        <SlideLabel show={expanded} className="brand-text">
          <span className="brand-title">HorizonUI</span>
          <span className="brand-sub">Launcher · v{appVersion}</span>
        </SlideLabel>
      </div>

      <LayoutGroup id="sidebar-nav">
        <nav className="nav">
          {NAV.map((item) => {
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-btn${isActive ? " active" : ""}`}
                onClick={() => onNavigate(item.id)}
                title={item.label}
                disabled={item.id === "instance" && !selectedProfileId}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-nav-pill"
                    className="nav-active-pill"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 36,
                      mass: 0.8,
                    }}
                  />
                )}
                <span className="nav-icon-wrap">
                  <Icon name={item.icon} size={18} />
                </span>
                <SlideLabel show={expanded} className="nav-label">
                  {item.label}
                </SlideLabel>
              </button>
            );
          })}
        </nav>
      </LayoutGroup>

      <div className={`sidebar-footer${expanded ? " is-expanded" : " is-collapsed"}`}>
        <motion.button
          layout
          initial={false}
          type="button"
          className="sidebar-account-card"
          onClick={openAccountSettings}
          title={account ? `${account.username} — Account settings` : "Account settings"}
          transition={sidebarTransition}
        >
          {account ? (
            <AccountSkinHead
              account={account}
              className="sidebar-skin-head"
              size={40}
              title={account.username}
            />
          ) : (
            <div className="sidebar-skin-head placeholder" />
          )}
          <span className="sidebar-account-meta-clip">
            <span className="sidebar-account-meta">
              <span className="sidebar-account-name">
                {account ? account.username : "Not signed in"}
              </span>
              <span className="sidebar-account-type">
                {account ? authTypeLabel(account.authType) : "Offline"}
              </span>
            </span>
          </span>
        </motion.button>

        <motion.button
          layout
          initial={false}
          type="button"
          className="sidebar-toggle"
          onClick={toggleSidebar}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          transition={sidebarTransition}
        >
          <motion.span
            className="sidebar-toggle-icon"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={sidebarTransition}
          >
            <Icon name="chevron-right" size={16} />
          </motion.span>
        </motion.button>
      </div>
    </motion.aside>
  );
}
