export function Toggle({
  label,
  hint,
  value,
  onChange,
  compact,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className={`toggle-row${compact ? " compact" : ""}`}>
      <div className="toggle-copy">
        <span>{label}</span>
        {hint && <p className="toggle-hint">{hint}</p>}
      </div>
      <button
        type="button"
        className={`toggle ${value ? "on" : ""}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  );
}
