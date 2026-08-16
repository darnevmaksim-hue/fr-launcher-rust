import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./Icon";

export type ContextMenuEntry =
  | { type: "separator" }
  | {
      type: "item";
      id: string;
      label: string;
      icon?: IconName;
      checked?: boolean;
      disabled?: boolean;
      danger?: boolean;
      submenu?: ContextMenuEntry[];
      onSelect?: () => void;
    };

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

const menuEase = [0.22, 1, 0.36, 1] as const;

export function ContextMenu({ open, x, y, items, onClose }: ContextMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState<{ x: number; y: number } | null>(null);
  const [sub, setSub] = useState<{
    id: string;
    top: number;
    items: ContextMenuEntry[];
    side: "left" | "right";
  } | null>(null);
  const originRef = useRef({ x, y });
  if (originRef.current.x !== x || originRef.current.y !== y) {
    originRef.current = { x, y };
    if (clamped) setClamped(null);
  }
  const pos = clamped ?? { x, y };

  useEffect(() => {
    if (!open) setSub(null);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setClamped(null);
      return;
    }
    const menu = rootRef.current?.querySelector(".ctx-menu");
    if (!(menu instanceof HTMLElement)) return;
    const pad = 10;
    const rect = menu.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (nx + rect.width > window.innerWidth - pad) {
      nx = window.innerWidth - rect.width - pad;
    }
    if (ny + rect.height > window.innerHeight - pad) {
      ny = window.innerHeight - rect.height - pad;
    }
    setClamped((prev) => {
      const next = {
        x: Math.max(pad, nx),
        y: Math.max(pad, ny),
      };
      if (prev && prev.x === next.x && prev.y === next.y) return prev;
      return next;
    });
  }, [open, x, y, items]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("mousedown", onPointer, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("mousedown", onPointer, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("blur", onClose);
    };
  }, [open, onClose]);

  const openSubmenu = (itemId: string, itemEl: HTMLElement, submenu: ContextMenuEntry[]) => {
    const menu = itemEl.closest(".ctx-menu");
    const menuWidth = menu instanceof HTMLElement ? menu.offsetWidth : 196;
    const spaceRight = window.innerWidth - (pos.x + menuWidth + 8);
    setSub({
      id: itemId,
      top: itemEl.offsetTop,
      items: submenu,
      side: spaceRight < 180 ? "left" : "right",
    });
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={rootRef}
          className="ctx-root"
          style={{ left: pos.x, top: pos.y }}
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: 0.16, ease: menuEase }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <MenuPanel
            items={items}
            activeSubId={sub?.id ?? null}
            onOpenSubmenu={openSubmenu}
            onCloseSubmenu={() => setSub(null)}
            onClose={onClose}
          />
          <AnimatePresence>
            {sub && (
              <motion.div
                className={`ctx-submenu-slot ctx-submenu-${sub.side}`}
                style={{ top: sub.top }}
                initial={{ opacity: 0, x: sub.side === "right" ? 8 : -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: sub.side === "right" ? 6 : -6 }}
                transition={{ duration: 0.14, ease: menuEase }}
              >
                <MenuPanel items={sub.items} onClose={onClose} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function MenuPanel({
  items,
  activeSubId,
  onOpenSubmenu,
  onCloseSubmenu,
  onClose,
}: {
  items: ContextMenuEntry[];
  activeSubId?: string | null;
  onOpenSubmenu?: (id: string, el: HTMLElement, submenu: ContextMenuEntry[]) => void;
  onCloseSubmenu?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="ctx-menu" role="menu">
      {items.map((entry, index) => {
        if (entry.type === "separator") {
          return <div key={`sep-${index}`} className="ctx-sep" />;
        }
        const hasSub = Boolean(entry.submenu?.length);
        return (
          <button
            key={entry.id}
            type="button"
            role="menuitem"
            className={`ctx-item${entry.checked ? " is-checked" : ""}${entry.danger ? " is-danger" : ""}${activeSubId === entry.id ? " is-open" : ""}`}
            disabled={entry.disabled}
            onMouseEnter={(event) => {
              if (hasSub && entry.submenu && onOpenSubmenu) {
                onOpenSubmenu(entry.id, event.currentTarget, entry.submenu);
              } else {
                onCloseSubmenu?.();
              }
            }}
            onClick={(event) => {
              if (hasSub && entry.submenu && onOpenSubmenu) {
                onOpenSubmenu(entry.id, event.currentTarget, entry.submenu);
                return;
              }
              entry.onSelect?.();
              onClose();
            }}
          >
            <span className="ctx-item-icon">
              {entry.icon ? <Icon name={entry.icon} size={14} /> : null}
            </span>
            <span className="ctx-item-label">{entry.label}</span>
            {entry.checked && <Icon name="check" size={13} />}
            {hasSub && <Icon name="chevron-right" size={13} className="ctx-caret" />}
          </button>
        );
      })}
    </div>
  );
}
