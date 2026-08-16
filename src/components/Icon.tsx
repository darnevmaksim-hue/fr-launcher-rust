import type { SVGProps } from "react";

export type IconName =
  | "play"
  | "layers"
  | "settings"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "plus"
  | "minus"
  | "close"
  | "minimize"
  | "maximize"
  | "diamond"
  | "check"
  | "edit"
  | "folder"
  | "trash"
  | "user"
  | "info"
  | "download"
  | "key"
  | "cpu";

const paths: Record<IconName, React.ReactNode> = {
  play: (
  <>
    <path d="M8 5.5v13l11-6.5-11-6.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </>
  ),
  layers: (
  <>
    <path d="M12 3L4 8l8 5 8-5-8-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M4 12l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M4 16l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </>
  ),
  settings: (
  <>
    <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </>
  ),
  "chevron-left": (
    <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "chevron-right": (
    <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  "chevron-down": (
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  plus: (
    <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  ),
  minus: (
    <path d="M6 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  ),
  close: (
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  ),
  minimize: (
    <path d="M6 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  ),
  maximize: (
    <>
      <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
  diamond: (
    <path d="M12 4l7 7-7 7-7-7 7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  ),
  check: (
    <path d="M6 12l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  edit: (
    <>
      <path
        d="M4 20h4L19 9l-4-4L4 16v4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  folder: (
    <path
      d="M3 7h6l2 2h10v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  trash: (
    <>
      <path d="M5 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 7V5h4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 19c.8-3.2 3.2-5 6.5-5s5.7 1.8 6.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.8" fill="currentColor" />
    </>
  ),
  download: (
    <>
      <path d="M12 5v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 14h8l-2-2 2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  cpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
