import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { displaySrc, fileToBlob, isGifPath } from "../lib/imageUrl";
import { useLauncherStore } from "../store/launcherStore";

const MAX_FRAMES = 48;
const MAX_EDGE = 960;
const CROSSFADE = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as const,
};

function backgroundFrames(
  asset: { path?: string | null; frames?: string[] } | undefined,
): string[] {
  if (!asset) return [];
  if (asset.frames && asset.frames.length > 0) return asset.frames;
  return asset.path ? [asset.path] : [];
}

function preparePlayback(paths: string[], fps: number) {
  if (paths.length <= MAX_FRAMES) {
    return { paths, fps };
  }
  const out: string[] = [];
  const last = paths.length - 1;
  for (let i = 0; i < MAX_FRAMES; i++) {
    const index = Math.round((i * last) / (MAX_FRAMES - 1));
    const path = paths[index];
    if (path && out[out.length - 1] !== path) out.push(path);
  }
  const scaled = Math.max(1, (fps * out.length) / paths.length);
  return { paths: out, fps: scaled };
}

function displaySize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  const width = Math.max(1, Math.round(window.innerWidth * dpr));
  const height = Math.max(1, Math.round(window.innerHeight * dpr));
  const edge = Math.max(width, height);
  if (edge <= MAX_EDGE) return { width, height };
  const scale = MAX_EDGE / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function releaseBitmaps(list: ImageBitmap[]) {
  for (const bitmap of list) {
    try {
      bitmap.close();
    } catch {
    }
  }
}

async function decodeFrame(
  path: string,
  width: number,
  height: number,
): Promise<ImageBitmap> {
  const blob = await fileToBlob(path);
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "low",
      });
    } catch {
      return await createImageBitmap(blob);
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("No canvas context");
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawBitmap(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  width: number,
  height: number,
) {
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
}

function FrameCanvas({
  bitmaps,
  fps,
}: {
  bitmaps: ImageBitmap[];
  fps: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || bitmaps.length < 2) return;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return;

    const size = displaySize();
    canvas.width = size.width;
    canvas.height = size.height;

    let raf = 0;
    let index = 0;
    let acc = 0;
    let last = performance.now();
    const step = 1000 / Math.max(1, fps);

    const paint = (bitmap: ImageBitmap) => {
      ctx.fillStyle = "#06080d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawBitmap(ctx, bitmap, canvas.width, canvas.height);
    };

    paint(bitmaps[0]);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) {
        last = now;
        return;
      }
      acc += now - last;
      last = now;
      if (acc < step) return;
      acc -= step;
      if (acc > step) acc = 0;
      index = (index + 1) % bitmaps.length;
      paint(bitmaps[index]);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bitmaps, fps]);

  return <canvas ref={canvasRef} className="launcher-bg-img is-animated" />;
}

type Layer = {
  id: string;
  src?: string;
  gif?: boolean;
  bitmaps?: ImageBitmap[];
  fps?: number;
};

export function LauncherBackground() {
  const horizonConfig = useLauncherStore((s) => s.horizonConfig);
  const backgrounds = useLauncherStore((s) => s.backgrounds);
  const animated =
    useLauncherStore((s) => s.launcherSettings?.animatedBackgrounds) ?? false;

  const bgName = horizonConfig?.background ?? "default";
  const asset = backgrounds.find((b) => b.name === bgName);
  const framePaths = backgroundFrames(asset);
  const firstPath = framePaths[0] ?? null;
  const gif = Boolean(firstPath && isGifPath(firstPath));
  const instanceFps = Math.min(
    60,
    Math.max(1, horizonConfig?.backgroundFrame ?? 20),
  );

  const [layer, setLayer] = useState<Layer | null>(null);
  const layerRef = useRef<Layer | null>(null);
  const pendingRelease = useRef<ImageBitmap[][]>([]);
  layerRef.current = layer;

  const commitLayer = (next: Layer | null) => {
    const prev = layerRef.current;
    if (prev?.bitmaps && prev.bitmaps !== next?.bitmaps) {
      pendingRelease.current.push(prev.bitmaps);
    }
    setLayer(next);
  };

  useEffect(() => {
    let cancelled = false;
    const id = `${firstPath ?? "default"}:${animated ? "on" : "off"}`;

    if (!firstPath) {
      commitLayer(null);
      return () => {
        cancelled = true;
      };
    }

    const playGif = animated && gif;
    const playFrames = animated && !gif && framePaths.length > 1;

    void (async () => {
      try {
        const src = await displaySrc(firstPath);
        if (cancelled) return;

        if (!playFrames) {
          commitLayer({ id, src, gif: playGif });
          return;
        }

        if (!layerRef.current) {
          commitLayer({ id: `${id}:still`, src });
        }

        const playback = preparePlayback(framePaths, instanceFps);
        const size = displaySize();
        const loaded: ImageBitmap[] = [];
        try {
          for (const path of playback.paths) {
            if (cancelled) break;
            const bitmap = await decodeFrame(path, size.width, size.height);
            if (cancelled) {
              bitmap.close();
              break;
            }
            loaded.push(bitmap);
          }
          if (cancelled) {
            releaseBitmaps(loaded);
            return;
          }
          commitLayer({
            id,
            src,
            bitmaps: loaded,
            fps: playback.fps,
          });
        } catch {
          releaseBitmaps(loaded);
          if (!cancelled) commitLayer({ id, src });
        }
      } catch {
        if (!cancelled) commitLayer(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [firstPath, framePaths.join("|"), animated, gif, instanceFps]);

  useEffect(() => {
    return () => {
      releaseBitmaps(layerRef.current?.bitmaps ?? []);
      for (const list of pendingRelease.current) releaseBitmaps(list);
      pendingRelease.current = [];
    };
  }, []);

  return (
    <div className="launcher-bg" aria-hidden>
      <AnimatePresence
        initial={false}
        onExitComplete={() => {
          const keep = layerRef.current?.bitmaps;
          const leftover = pendingRelease.current.filter((list) => list !== keep);
          pendingRelease.current = keep ? [keep] : [];
          for (const list of leftover) releaseBitmaps(list);
        }}
      >
        {layer && (
          <motion.div
            key={layer.id}
            className="launcher-bg-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={CROSSFADE}
          >
            {layer.bitmaps && layer.bitmaps.length > 1 ? (
              <FrameCanvas bitmaps={layer.bitmaps} fps={layer.fps ?? instanceFps} />
            ) : layer.src ? (
              <img
                src={layer.src}
                alt=""
                className={`launcher-bg-img${layer.gif ? " is-animated" : ""}`}
              />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="launcher-bg-vignette" />
    </div>
  );
}
