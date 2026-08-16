import { motion } from "framer-motion";
import { useRef } from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  compact?: boolean;
  pillId?: string;
}

const spring = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.8 };

export function Tabs({ tabs, active, onChange, compact, pillId = "tab-active-pill" }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={`tabs${compact ? " tabs-compact" : ""}`}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn${isActive ? " active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {isActive && (
              <motion.span
                layoutId={pillId}
                className="tab-active-pill"
                transition={spring}
              />
            )}
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
