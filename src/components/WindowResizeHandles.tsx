import { getCurrentWindow } from "@tauri-apps/api/window";

type ResizeDirection =
  | "North"
  | "NorthEast"
  | "East"
  | "SouthEast"
  | "South"
  | "SouthWest"
  | "West"
  | "NorthWest";

const EDGES: ResizeDirection[] = [
  "North",
  "NorthEast",
  "East",
  "SouthEast",
  "South",
  "SouthWest",
  "West",
  "NorthWest",
];

export function WindowResizeHandles() {
  const startResize = (direction: ResizeDirection) => {
    getCurrentWindow().startResizeDragging(direction).catch(() => undefined);
  };

  return (
    <div className="window-resize-layer" aria-hidden>
      {EDGES.map((direction) => (
        <div
          key={direction}
          className={`window-resize-edge edge-${direction.toLowerCase()}`}
          onMouseDown={(event) => {
            event.preventDefault();
            startResize(direction);
          }}
        />
      ))}
    </div>
  );
}
