import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999_999,
  step = 1,
  suffix,
}: NumberStepperProps) {
  const [draft, setDraft] = useState(String(value));
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const [hold, setHold] = useState<0 | -1 | 1>(0);

  useEffect(() => {
    valueRef.current = value;
    setDraft(String(value));
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const clamp = (n: number) => {
    const snapped = Math.round(n / step) * step;
    return Math.min(max, Math.max(min, snapped));
  };

  const nudge = (dir: -1 | 1) => {
    onChangeRef.current(clamp(valueRef.current + dir * step));
  };

  useEffect(() => {
    if (hold === 0) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - started < 320) return;
      nudge(hold);
    }, 70);
    return () => window.clearInterval(id);
  }, [hold, step, min, max]);

  const commitDraft = () => {
    const parsed = Number(draft.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) {
      onChange(clamp(parsed));
    } else {
      setDraft(String(value));
    }
  };

  const startHold = (dir: -1 | 1) => {
    nudge(dir);
    setHold(dir);
  };

  return (
    <div className="number-stepper">
      <button
        type="button"
        className="number-stepper-btn"
        aria-label="Decrease"
        disabled={value <= min}
        onPointerDown={() => startHold(-1)}
        onPointerUp={() => setHold(0)}
        onPointerCancel={() => setHold(0)}
        onPointerLeave={() => setHold(0)}
      >
        <Icon name="minus" size={14} />
      </button>
      <div className="number-stepper-field">
        <input
          className="number-stepper-input"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              nudge(1);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              nudge(-1);
            }
          }}
        />
        {suffix && <span className="number-stepper-suffix">{suffix}</span>}
      </div>
      <button
        type="button"
        className="number-stepper-btn"
        aria-label="Increase"
        disabled={value >= max}
        onPointerDown={() => startHold(1)}
        onPointerUp={() => setHold(0)}
        onPointerCancel={() => setHold(0)}
        onPointerLeave={() => setHold(0)}
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}
